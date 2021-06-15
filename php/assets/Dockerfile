FROM ubuntu:20.04

ARG DEBIAN_FRONTEND=noninteractive

ARG ONDREJPHP_KEY="14AA40EC0831756756D7F66C4F4EA0AAE5267A6C"

ARG PHP_VERSIONS="7.4 8.0"

RUN set -o errexit ;\
    echo 'Updating the system' ;\
    apt-get update -q ;\
    apt-get upgrade -qy ;\
    apt-get autoremove --purge -qy ;\
    echo 'Installing required system packages' ;\
    apt-get install -qy --no-install-recommends apt-transport-https ca-certificates gnupg2 curl unzip ;\
    echo 'Adding Ondrej PHP' ;\
    printf 'deb http://ppa.launchpad.net/ondrej/php/ubuntu %s main\n' "$(. /etc/os-release && echo $VERSION_CODENAME)" >/etc/apt/sources.list.d/ondrej-php.list ;\
    LC_ALL=C.UTF-8 apt-key adv --keyserver keyserver.ubuntu.com --recv-keys "$ONDREJPHP_KEY" || LC_ALL=C.UTF-8 apt-key adv --keyserver keyserver.ubuntu.com --recv-keys "$ONDREJPHP_KEY" ;\
    apt-get update -q ;\
    echo 'Configuring PHP versions' ;\
    APT_PACKAGES='' ;\
    for PHP_VERSION in $PHP_VERSIONS; do \
        APT_PACKAGES="$APT_PACKAGES php$PHP_VERSION-cli php$PHP_VERSION-curl php$PHP_VERSION-mbstring php$PHP_VERSION-zip" ;\
    done ;\
    echo 'Installing PHP versions' ;\
    apt-get install -qy --no-install-recommends $APT_PACKAGES ;\
    echo 'Installing Composer' ;\
    curl -sSLf -o /composer-installer https://getcomposer.org/installer ;\
    EXPECTED_DOCKER_SIGNATURE="$(curl -sSLf https://composer.github.io/installer.sig)" ;\
    ACTUAL_DOCKER_SIGNATURE="$(php -r 'echo hash_file("sha384", "/composer-installer");')" ;\
    if test "$EXPECTED_DOCKER_SIGNATURE" != "$ACTUAL_DOCKER_SIGNATURE"; then \
        echo 'Verification of composer installed signature failed' >&2 ;\
        exit 1; \
    fi ;\
    php /composer-installer --install-dir=/usr/local/bin --filename=composer --2 ;\
	rm /composer-installer ;\
    echo 'Cleanup' ;\
    rm -rf /var/lib/apt/lists/* ;\
    echo 'All done'

ENV PHPCSFIXERCONFIGURATOR_DOCKER=y
