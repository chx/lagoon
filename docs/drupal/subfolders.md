# Subfolders

An example could be: `www.example.com` points to one Drupal site, while `www.example.com/blog` loads a blog built in another Drupal.

It would be possible to run both Drupals in a single Git repository and deploy it as a whole, but this workflow might not fit every team, and having separate Git repositories fits some situations better.

## Modifications of root application

The root application \(in this example, the Drupal site for `www.example.com`\), needs a couple of Nginx configs that will configure NGINX to be a reverse proxy to the subfolder applications:

### `location_prepend.conf`

Create a file called `location_prepend.conf` in the root of your Drupal installation:

```text title="location_prepend.conf"
resolver 8.8.8.8 valid=30s;

location ~ ^/subfolder {
  # If $http_x_forwarded_proto is empty (If it is not set from an upstream reverseproxy).
  # Aet it to the current scheme.
  set_if_empty $http_x_forwarded_proto $scheme;

  proxy_set_header      X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header      X-Forwarded-Proto $scheme;
  proxy_set_header      X-Forwarded-Proto $http_x_forwarded_proto;
  proxy_set_header      X-Lagoon-Forwarded-Host $host;
  # Will be used by downstream to know the original host.
  proxy_set_header      X-REVERSEPROXY $hostname;
  proxy_set_header      FORWARDED "";
  # Unset FORWARDED because drupal8 gives errors if it is set.
  proxy_set_header      Proxy "";
  # Unset Proxy because drupal8 gives errors if it is set.
  proxy_ssl_server_name on;

  # Nginx needs a variable set in order for the DNS resolution to work correctly.
  set                   $subfolder_drupal_host "https://nginx-lagoonproject-${LAGOON_GIT_SAFE_BRANCH}.clustername.com:443";
  # LAGOON_GIT_SAFE_BRANCH variable will be replaced during docker entrypoint.
  proxy_pass            $subfolder_drupal_host;
  proxy_set_header      Host $proxy_host;
  # $proxy_host will be automatically generated by Nginx based on proxy_pass (it needs to be without scheme and port).

  expires off; # make sure we honor cache headers from the proxy and not overwrite them
```

Replace the following strings:

* `/subfolder` with the name of the subfolder you want to use. For example, `/blog`.
* `nginx` with the service that you want to point too in the subfolder project.
* `lagoonproject` with the Lagoon projectname of the subfolder project.

### NGINX Dockerfile

Add the following to your NGINX Dockerfile \(`nginx.dockerfile` or `Dockerfile.nginx`\):

```text title="nginx.dockerfile"
COPY location_prepend.conf /etc/nginx/conf.d/drupal/location_prepend.conf
RUN fix-permissions /etc/nginx/conf.d/drupal/*
```

## Modifications of subfolder application

Like the root application, we also need to teach the subfolder application \(in this example, the Drupal installation for `www.example.com/blog`\), that it is running under a subfolder. To do this, we create two files:

### `location_drupal_append_subfolder.conf`

Create a file called `location_drupal_append_subfolder.conf` in the root of your subfolder Drupal installation:

```text title="location_drupal_append_subfolder.conf"
# When injecting a script name that is prefixed with `subfolder`, Drupal will
# render all URLs with `subfolder` prefixed
fastcgi_param  SCRIPT_NAME        /subfolder/index.php;

# If we are running via a reverse proxy, we inject the original HOST URL
# into PHP. With this Drupal will render all URLs with the original HOST URL,
# and not the current used HOST.

# We first set the HOST to the regular host variable.
fastcgi_param  HTTP_HOST          $http_host;
# Then we overwrite it with `X-Lagoon-Forwarded-Host` if it exists.
fastcgi_param  HTTP_HOST          $http_x_lagoon_forwarded_host if_not_empty;
```

Replace `/subfolder` with the name of the subfolder you want to use. For example, `/blog`.

### `server_prepend_subfolder.conf`

Create a file called `server_prepend_subfolder.conf` in the root of your subfolder Drupal installation:

```text title="server_prepend_subfolder.conf"
# Check for redirects before we do the internal Nginx rewrites.
# This is done because the internal Nginx rewrites uses `last`,
# which instructs Nginx to not check for rewrites anymore (and
# `if` is part of the redirect module).
include /etc/nginx/helpers/010_redirects.conf;

# This is an internal Nginx rewrite, it removes `/subfolder/`
# from the requests so that Nginx handles the request as it would
# have been `/` from the beginning.
# The `last` flag is also important. It will cause Nginx not to
# execute any more rewrites, because it would redirect forever
# with the rewrites below.
rewrite ^/subfolder/(.*)          /$1             last;

# Make sure redirects are NOT absolute, to ensure Nginx does not
# overwrite the host of the URL - which could be something other than
# what Nginx currently thinks it is serving.
absolute_redirect off;

# If a request just has `/subfolder` we 301 redirect to `/subfolder/`
# (Drupal really likes a trailing slash)
rewrite ^/subfolder               /subfolder/     permanent;

# Any other request we prefix 301 redirect with `/subfolder/`
rewrite ^\/(.*)                   /subfolder/$1   permanent;
```

Replace `/subfolder` with the name of the subfolder you want to use. For example, `/blog`.

### Nginx Dockerfile

We also need to modify the NGINX Dockerfile.

Add the following to your NGINX Dockerfile \(`nginx.dockerfile` or `Dockerfile.nginx`\):

```text title="nginx.dockerfile"
COPY location_drupal_append_subfolder.conf /etc/nginx/conf.d/drupal/location_drupal_append_subfolder.conf
COPY server_prepend_subfolder.conf /etc/nginx/conf.d/drupal/server_prepend_subfolder.conf
RUN fix-permissions /etc/nginx/conf.d/drupal/*
```
