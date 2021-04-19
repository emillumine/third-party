FROM python:3-slim

# Add french locale
RUN apt update && \
    apt install -y --no-install-recommends locales && \
    rm -rf /var/lib/apt/lists/* && \
    sed -i '/^#.* fr_FR.UTF-8 /s/^#//' /etc/locale.gen && \
    locale-gen

# Virtual env:
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

WORKDIR /home/app

# Install dependencies:
COPY requirements.txt /home/app/
RUN pip install -r requirements.txt

# Setup volume to be able to dev application locally
VOLUME /home/app

# Run the application:
EXPOSE 8080
CMD ["./launch.sh", "0.0.0.0", "8080"]
