#Data Steward Studio
[TOC]

## Prerequisites 

- JDK 8
- SBT 0.13.1 or above
- Angular4
  - Nodejs 6.10.0 or above
  - [Yarn](https://yarnpkg.com) package manager

## Development Setup

The middleware contains the api's that are needed by dss, few api calls need app and cluster service as well hence all the services need to be up and running for the complete working of DSS.  To start all the services please go through DP [Readme](https://github.com/hortonworks/dataplane/blob/master/README-dev.md#run).

### GUI

The gui uses port 4300. You can launch GUI @http://localhost:4300

```
cd dp-plugin-apps/dss/dss-web
yarn install --pure-lockfile
npm run dev
```

### Middleware

The api uses port 9012. You can view the api's using @http://localhost:9012/

```
cd dp-plugin-apps/dss
./runDSSApp.sh
```

## Docker 

The below command would build and deploy a DSS docker, the docker registers with consul and zuul automatically.

```
cd dp-plugin-apps/dss/dss-build
./build.sh
./dss-docker-build.sh build
cd  install 
./dssdeploy.sh init
```

