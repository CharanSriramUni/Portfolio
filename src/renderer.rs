pub mod document_renderer {
    use actix_files as fs;
    use std::{io, path::Path, fmt::Write};
    use askama_escape::{escape as escape_html_entity, Html};
    use percent_encoding::{utf8_percent_encode, CONTROLS};
    use fs::Directory;
    use actix_web::{Result, HttpResponse};

    macro_rules! encode_file_url {
        ($path:ident) => {
            utf8_percent_encode(&$path, CONTROLS)
        };
    }
    
    macro_rules! encode_file_name {
        ($entry:ident) => {
            escape_html_entity(&$entry.file_name().to_string_lossy(), Html)
        };
    }


    /**
     * Small custom renderer I modifed from the original source code for directory rendering in Actix-web
     * It just uses the Waters.css files for styling and adds some support for my session system
     */
    pub fn custom_renderer(
        dir: &Directory,
        path: &str,
    ) -> Result<HttpResponse, io::Error> {
        let index_of = format!("Posts");
        let mut body = String::new();
        let base = Path::new(path);
    
        for entry in dir.path.read_dir()? {
            if dir.is_visible(&entry) {
                let entry = entry.unwrap();
                let p = match entry.path().strip_prefix(&dir.path) {
                    Ok(p) if cfg!(windows) => base.join(p).to_string_lossy().replace('\\', "/"),
                    Ok(p) => base.join(p).to_string_lossy().into_owned(),
                    Err(_) => continue,
                };
    
                // if file is a directory, add '/' to the end of the name
                if let Ok(metadata) = entry.metadata() {
                    if metadata.is_dir() {
                        let _ = write!(
                            body,
                            "<li><a href=\"{}\">{}/</a></li>",
                            encode_file_url!(p),
                            encode_file_name!(entry),
                        );
                    } else {
                        if p.contains("secure.") {
                            let formatted_name = encode_file_name!(entry).to_string();
                            let display_name = formatted_name.replace("secure.", "").replace(".html", "");
                            
                            let _ = write!(
                                body,
                                "<li><a href=\"{}\">🔒 {}</a></li>",
                                encode_file_url!(p),
                                display_name,
                            );
                        } else {
                            let _ = write!(
                                body,
                                "<li><a href=\"{}\">{}</a></li>",
                                encode_file_url!(p),
                                encode_file_name!(entry),
                            );
                        }
                    }
                } else {
                    continue;
                }
            }
        }
    
        let html = format!(
            "<html>\
             <head>
                <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                <title>Posts</title>
                <link rel=\"stylesheet\" href=\"/static/styles.css\">
            </head>\
             <body><h1>{}</h1>\
             <ul>\
             {}\
             </ul></body>\n</html>",
            index_of, body
        );

        Ok(HttpResponse::Ok()
            .content_type("text/html; charset=utf-8")
            .body(html)
        )
    }
}