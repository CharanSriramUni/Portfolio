FROM rust:1.67
COPY . .
RUN cargo build --release
EXPOSE 8080
CMD ["./target/release/portfolio"]