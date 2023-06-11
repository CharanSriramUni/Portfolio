# My Portfolio
Hey! This is the source code behind my [personal site](https://charansriram.com).

It's written mostly in Rust and uses Actix-Web as a web server. I chose to write it in Rust since
I wanted to see how support for writing servers has developed since I last used it, and I want to get
more familiar with practical Rust for some other project ideas I'm working on.

Styling is done using Water.css (hands-off styling). 

The server is containerized in a small Dockerfile and I've included the fly.toml file for reference. 

The notes directory is meant to contain HTML pages for blog posts/notes. I've added a cool little feature
to "password" protect certain files- just add a "secure.json" file to the src folder in the following format:
```
{
    "secure.filename.html": "password"
}
```
Prepending a file with "secure." and adding it to the notes folder/secure.json file lets you include weak
"password" protected files with links that expire in an hour. It's just a fun way to 
keep my notes accessible and reward those who can guess what passwords I'd pick. As a rule of thumb, 
I try to make them one word long and related to the contents of the note/post.