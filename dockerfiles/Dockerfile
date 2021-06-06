FROM python:3

ENV PYTHONUNBUFFERED=1

# Add french locale
RUN apt update && \
    apt install -y --no-install-recommends locales && \
    rm -rf /var/lib/apt/lists/* && \
    sed -i '/^#.* fr_FR.UTF-8 /s/^#//' /etc/locale.gen && \
    locale-gen

WORKDIR /home/app

RUN pip install --upgrade pip

COPY requirements.txt /home/app/
RUN pip install -r requirements.txt

# Setup volume to be able to dev application locally
VOLUME /home/app
COPY . /home/app

# Run the application:
EXPOSE 8080
CMD ["./launch.sh", "0.0.0.0", "8080"]
