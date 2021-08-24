FROM rust:1.54.0 as builder
WORKDIR /usr/src/scheduler
COPY . .
RUN cargo install --path .

CMD ["scheduler-rust"]