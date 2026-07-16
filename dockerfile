FROM alpine:3.23

ARG PB_VERSION=0.36.2

RUN apk add --no-cache curl unzip ca-certificates && \
  mkdir -p /pb/pb_data && \
  curl -L -o /tmp/pb.zip \
  https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip && \
  unzip /tmp/pb.zip -d /pb && \
  chmod +x /pb/pocketbase && \
  rm /tmp/pb.zip

WORKDIR /pb
EXPOSE 8080

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080", "--dir=/pb/pb_data"]