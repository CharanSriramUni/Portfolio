# My Portfolio
Hey! This is the source code behind my [personal site](https://charansriram.com).

It's written mostly in Rust and uses Actix-Web as a web server. I chose to write it in Rust since
I wanted to see how support for writing servers has developed since I last used it, and I want to get
more familiar with practical Rust for some other project ideas I'm working on.

Styling is done using Water.css (hands-off styling). 

The server is containerized in a small Dockerfile and I've included the fly.toml file for reference. 
If you want to deploy your own version of the site, just add a "secure.json" file to the src folder in
the following format:
```
{
    "secure.filename.html": "password"
}
```
This lets you include weak "password" protected files with links that expire in an hour- it's just a fun way to 
keep my notes accessible and reward those who can guess what passwords I'd pick. 