# Node.js

The [Lagoon `node` Docker image](https://github.com/uselagoon/lagoon-images/tree/main/images/node). Based on [the official Node Alpine images](https://hub.docker.com/_/node/).

## Supported Versions

* 10 - End of Life \(EOL\) as of 2021-04-30
* 12 `uselagoon/node-12` or `uselagoon/node-12-builder`
* 14 `uselagoon/node-14` or `uselagoon/node-14-builder`
* 16 `uselagoon/node-16` or `uselagoon/node-16-builder`

!!! Note "Note:"
    We stop updating EOL Node.js images usually with the Lagoon release that comes after the officially communicated EOL date: [https://nodejs.org/en/about/releases/](https://nodejs.org/en/about/releases/).

## Lagoon adaptions

We ship 2 versions of Node.js images: the normal `node:version` image and the `node:version-builder`.

The builder variant of those images comes with additional tooling that is needed when you run Node.js builds. For a full list check out the [Dockerfile](https://github.com/uselagoon/lagoon-images/tree/main/images/node-builder).

The default exposed port of node containers is port `3000`.

## Environment Variables

Environment variables are meant to contain common information for the PHP container.

| Environment Variable | Default | Description |
| :--- | :--- | :--- |
| `LAGOON_LOCALDEV_HTTP_PORT` | 3000 | tells the local development environment on which port we are running |
