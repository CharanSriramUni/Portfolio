import React, { useEffect, useRef, useState } from 'react'
import { styled, globalCss } from '@stitches/react';
import { FaceCamComponent } from './video';
import { StopIcon, CircleIcon, DownloadIcon, ResetIcon } from '@radix-ui/react-icons'

const globalStyles = globalCss({
    '*': {
        fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"',
        boxSizing: "border-box",
    }
});

const Wrapper = styled('div', {
    position: "absolute",
    left: 20,
    bottom: 20,
    zIndex: 10,
    height: "250px",
    width: "200px",
})

const SideBar = styled('div', {
    position: "absolute",
    top: 0,
    right: -50,
    width: "40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "start",
    justifyContent: "center",
})

const Controls = styled('div', {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "10px",
    paddingTop: "13px",
    paddingBottom: "13px",

    /* From https://css.glass */
    background: "rgba(117, 117, 117, 0.2)",
    borderRadius: "15px",
    boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
    backdropFilter: "blur(5px)",
    border: "1px solid rgba(117, 117, 117, 0.1)"
})

const DisplayTime = styled('p', {
    color: "black",
    fontSize: "12px",
    padding: "10px",
    display: "flex",
    minWidth: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "5px",
    background: "rgba(117, 117, 117, 0.2)",
    borderRadius: "15px",
    boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
    backdropFilter: "blur(5px)",
    border: "1px solid rgba(117, 117, 117, 0.1)",
    userSelect: "none",

    variants: {
        recording: {
            true: {
                color: "hsl(358 75.0% 59.0%)",
            }
        }
    }
})

const HiddenDownload = styled('a', {
    display: "none",
})

enum Control {
    START,
    PAUSE,
    RESET,
    INACTIVE
}

// Little helper function to get the current date in MM/DD format
function getCurrentDateMMDD() {
    const date = new Date(); // gets the current date
    const month = date.getMonth() + 1; // getMonth() returns a zero-based month, so we add 1
    const day = date.getDate(); // gets the day of the month
    
    // Ensure month and day are always two digits by padding with a zero if necessary
    const month_f = month < 10 ? '0' + month : month;
    const day_f = day < 10 ? '0' + day : day;

    // format the date in MM/DD format
    const formattedDate = month_f + '/' + day_f;

    return formattedDate;
}

// Little helper function to format the time in HH/SS format
function formatTime(seconds: number) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds - (hours * 3600)) / 60);
    seconds = seconds - (hours * 3600) - (minutes * 60);

    // pad minutes, and seconds to ensure they have two digits when needed
    const minutes_f = String(minutes).padStart(hours > 0 ? 2 : 1, '0');
    const seconds_f = String(seconds).padStart(2, '0');

    // format hours only when it's more than 0
    if(hours > 0) {
        return hours + ':' + minutes_f + ':' + seconds_f;
    } else {
        return minutes_f + ':' + seconds_f;
    }
}


export function App() {
    globalStyles();
    const [faceCam, setFaceCamStream] = useState<MediaStream | null>(null);
    const [isRecording, setRecordingStatus] = useState<boolean>(false);
    const [screenRecordingInitialized, setScreenRecordingInitialized] = useState<boolean>(false);
    const [timer, updateTimer] = useState<number>(0);

    const lastActionRef = useRef<Control>(Control.INACTIVE);
    const timerRef = useRef<number>(0);
    const screenRecording = useRef<MediaRecorder | null>(null);
    const screenDataArray = useRef<Blob[]>([]);
    const hiddenDownloadRef = useRef<HTMLAnchorElement | null>(null);

    useEffect(() => {
        async function io_setup() {
            const face_cam = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            setFaceCamStream(face_cam);
        }
        io_setup();
    }, [])

    function onRecordingDataAvailable(e: BlobEvent) {
        screenDataArray.current.push(e.data);

        // Perform cleanup here because it's async
        if (lastActionRef.current === Control.RESET) {
            screenRecording.current = null; // This will cause a new recorder to be created next time we start recording, wasteful but simple
            screenDataArray.current = []; // Clear the data array
        }
    }

    async function playBackControl(action: Control) {
        switch (action) {
            case Control.START:
                setRecordingStatus(true);

                if (screenRecording.current?.state === "paused") {
                    screenRecording.current?.resume();
                    timerRef.current = setInterval(() => { updateTimer((timer) => timer + 1) }, 1000);
                    return;
                }

                // Request screen capture permissions
                const screen_capture = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });

                // Create a new media recorder
                const screen_recording = new MediaRecorder(screen_capture);
                screenRecording.current = screen_recording;

                // As data comes in, we want to store it to the blob array
                screen_recording.ondataavailable = onRecordingDataAvailable;

                // Start recording
                screen_recording.start();
                timerRef.current = setInterval(() => { updateTimer((timer) => timer + 1) }, 1000);

                // Update state/UI
                setScreenRecordingInitialized(true); 
                
                lastActionRef.current = Control.START;
                break;
            case Control.PAUSE:
                clearInterval(timerRef.current);
                setRecordingStatus(false);
                screenRecording.current?.pause(); // Stop the screen capture
                screenRecording.current?.requestData(); // Request the data from the recorder (this will trigger the ondataavailable callback)
                
                lastActionRef.current = Control.PAUSE;
                break;
            case Control.RESET:
                // We perform media recorder cleanup in the callback since it's asynchronous
                screenRecording.current?.stop(); // Stop the screen capture

                // Update state/UI
                clearInterval(timerRef.current);
                updateTimer(0);
                setRecordingStatus(false);

                lastActionRef.current = Control.RESET;
                break;
            default:
                break;
        } 
    }

    // Download the recorded stream contents
    function downloadStream() {
        screenRecording.current?.requestData(); // Request the data from the recorder (this will trigger the ondataavailable callback)
        if (screenDataArray.current.length === 0) return;

        const recorded_blob = new Blob(screenDataArray.current, { type: 'video/webm' }); 
        const url = URL.createObjectURL(recorded_blob); // This lets us download the blob as a file
        
        // We use a hidden anchor tag to download the file
        const a = hiddenDownloadRef.current;
        if (a) {
            a.href = url;
            a.download = `(${getCurrentDateMMDD()})_fibre-recording.webm`;
            document.body.appendChild(a);
            
            a.click();  
            window.URL.revokeObjectURL(url);  
        }
    }
   
    // Render-time constants just to keep the render function clean
    const TIME = formatTime(timer);    
    const ICON_SIZE = 18;

    return (
        <Wrapper id="fibre__wrapper">
            <HiddenDownload ref={hiddenDownloadRef} />
            <FaceCamComponent muted srcObject={faceCam} />
            <SideBar>
                <Controls>
                    {
                        !isRecording || !screenRecordingInitialized ? (
                            <CircleIcon 
                                onClick={() => playBackControl(Control.START)} 
                                scale={ICON_SIZE} width={ICON_SIZE} 
                                style={{ marginBottom: "8px", cursor: "pointer" }} />
                        ) : 
                        (
                            <StopIcon 
                                onClick={() => playBackControl(Control.PAUSE)} 
                                scale={ICON_SIZE} width={ICON_SIZE} 
                                style={{ marginBottom: "8px", cursor: "pointer" }} />
                        )
                    }
                    <ResetIcon 
                        onClick={() => playBackControl(Control.RESET)} 
                        scale={ICON_SIZE} width={ICON_SIZE} style={{ cursor: "pointer", marginBottom: "8px" }} />
                    <DownloadIcon 
                        onClick={downloadStream}
                        scale={ICON_SIZE} width={ICON_SIZE} style={{ cursor: "pointer" }} />
                </Controls>
                <DisplayTime recording={isRecording && screenRecordingInitialized}>{TIME}</DisplayTime>
            </SideBar>
        </Wrapper>
    )
}