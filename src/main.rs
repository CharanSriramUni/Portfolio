pub mod renderer;
use std::{path::PathBuf, sync::Mutex, thread};
use crate::renderer::document_renderer::custom_renderer;
use uuid::Uuid;
use actix_files as fs;
use actix_web::{App, HttpServer, Result, web::{self, Redirect}, get, HttpRequest, HttpResponse, Either};
use serde::Deserialize;
use std::collections::HashMap;
use lazy_static::lazy_static;
use std::fs::File;

macro_rules! str {
    ($x: expr) => {
        String::from($x)
    };
}

lazy_static! {
    static ref PASSWORDS: HashMap<String, String> = {
        // Read the secure notes' passwords from the env file 
        let articles_file = File::open("./src/secure.json").unwrap();

        // Deserialize the JSON into a HashMap
        let mut articles: HashMap<String, String> = serde_json::from_reader(articles_file).unwrap();
        articles.insert(str!(""), str!("INITIALIZED"));

        articles
    };    
}

lazy_static! {
    // Wrap in Mutex to allow for thread to wipe sessions concurrently
    static ref PASSWORD_HASHES: Mutex<HashMap<String, String>> = {
        Mutex::new(HashMap::new())
    };    
}

#[derive(Deserialize)]
struct NotesAuthInfo {
    file: String,
    pwd: String,
}

// Landing page :D
async fn greet() -> Result<fs::NamedFile> {
    Ok(fs::NamedFile::open("pages/index.html")?)
}

// My resume (Updated Jun 29, 2024)
async fn resume() -> Result<fs::NamedFile> {
    Ok(fs::NamedFile::open("files/resume.pdf")?)
}

// Security
async fn secure() -> Result<fs::NamedFile> {
    Ok(fs::NamedFile::open("pages/secure.html")?)
}

// Handler for directory listing
// Uses the custom renderer from the renderer module which in turn uses actix's fs::Directory
#[get("")]
async fn notes() -> HttpResponse {
    match custom_renderer(&fs::Directory::new(PathBuf::from("./"), PathBuf::from("./notes")), "/notes") {
        Ok(res) => return res,
        Err(err) => {
            return HttpResponse::InternalServerError().body(format!("Error with rendering directory: {:}", err))
        }
    }
}

// Simple handler for password authentication
// Just checks if the password is correct and creates/returns a "session" token that will get wiped in <= 1 hour
async fn notes_auth(info: web::Json<NotesAuthInfo>) -> Result<String> {
    let file = info.file.clone();
    let pwd = info.pwd.clone();

    if let Some(v) = PASSWORDS.get(&*file) {
        if *v == pwd {
            let uuid = Uuid::new_v4().to_string();
            {
                PASSWORD_HASHES.lock().unwrap().insert(file.clone(), uuid.clone());    
            }
            return Ok(uuid)
        } else {
            return Ok(format!("Incorrect password"));
        }
    }

    Ok(format!("Incorrect password"))
}

// Handler for specific files
async fn notes_handler(req: HttpRequest) -> Either<fs::NamedFile, Redirect> {
    let file_name = req.match_info().get("filename");
    if file_name.is_none() {
        Either::Left(fs::NamedFile::open("pages/404.html").unwrap())
    } else {
        if file_name.unwrap().starts_with("secure") {
            let v = req.query_string().split("=").collect::<Vec<&str>>();

            if v.len() == 2 && v[0] == "pwd" {
                let password = v[1];

                // Checks password against hashmap - assuming they have a password in their query string
                if let Some(v) = PASSWORD_HASHES.lock().unwrap().get(file_name.unwrap()) {
                    if *v == password {
                        // Read from disk and return the file - can technically be saved by the user at this point but who cares
                        let path: std::path::PathBuf = PathBuf::from(format!("./notes/{:}", req.match_info().get("filename").unwrap()));
                        return Either::Left(fs::NamedFile::open(path).unwrap())
                    } else {
                        // Retry just alerts them that their password was wrong.
                        return Either::Right(Redirect::to(format!("/secure?file={:}&retry=1", file_name.unwrap())));
                    }
                } else {
                    // Retry just alerts them that their password was wrong.
                    return Either::Right(Redirect::to(format!("/secure?file={:}&retry=1", file_name.unwrap())));
                }
            } else if v.len() == 1 && v[0] == "" {
                // If they don't have the password in their query string, redirect them to the secure page
                return Either::Right(Redirect::to(format!("/secure?file={:}", file_name.unwrap())));
            }

            return Either::Left(fs::NamedFile::open("pages/404.html").unwrap())
        } 
        
        let path: std::path::PathBuf = PathBuf::from(format!("./notes/{:}", req.match_info().get("filename").unwrap()));
        let file = fs::NamedFile::open(path);

        if let Ok(f) = file {
            return Either::Left(f);
        } else {
            return Either::Left(fs::NamedFile::open("pages/404.html").unwrap())
        }
    }
}

// Our main function
#[actix_web::main] 
async fn main() -> std::io::Result<()> {
    println!("Starting server on {:}", 8080);
    println!("Initializing Password Map: \"{}\".", PASSWORDS.get("").unwrap());
    
    { // Give it its own scope so that the lock is released
        let mut map = PASSWORD_HASHES.lock().unwrap();
        map.insert(str!(""), str!("INITIALIZED"));    
    }

    // Wipe the password map every hour to erase sessions
    // Also prevents search engine indexing of password pages
    thread::spawn(move || {
        loop {
            thread::sleep(std::time::Duration::from_secs(60 * 60));
            { // Give it its own scope so that the lock is released
                println!("Clearing Password Map");
                if let Ok(mut v) = PASSWORD_HASHES.lock() {
                    v.clear();
                } else {
                    println!("Trouble clearing hashmap")
                }
            }
        }
    });

    HttpServer::new(|| {
        App::new()
            .route("/", web::get().to(greet)) // Home
            .route("/resume", web::get().to(resume)) // Resume
            .route("/secure", web::get().to(secure)) // Secure
            .route("/session", web::post().to(notes_auth))
            .route("/notes/{filename:.*}", web::get().to(notes_handler)) // Notes
            .service(web::scope("/notes").service(notes)) // Notes
            .service(fs::Files::new("/static", "./static"))
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}