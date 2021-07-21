#!/bin/bash

if [ -z "$1" ]
  then
    echo "No argument VERSION supplied"
    echo "./dora.sh <VERSION> <PLATFORM> <TYPE>"
    echo "VERSION: 0.1, PLATFORM: macos-x64 linux-x64, win-x64 TYPE: cli, electronapp"
    exit
fi

if [ -z "$2" ]
  then
    echo "No argument PLATFORM supplied"
    exit
fi

if [ -z "$3" ]
  then
    echo "No argument TYPE supplied"
    exit
fi

case "$OSTYPE" in
  solaris*) echo "SOLARIS NOT SUPPORTED"; exit ;;
  darwin*)  echo "OSX" ;; 
  linux*)   echo "LINUX" ;;
  msys*)    echo "WINDOWS";;
  bsd*)     echo "BSD NOT SUPPORTED"; exit ;;
  *)        echo "unknown: $OSTYPE NOT SUPPORTED"; exit ;;
esac

VERSION=$1
PLATFORM=$2
TYPE=$3

if [ $TYPE == "cli" ]
then
  if [ $PLATFORM == "win-x64" ] 
  then
    wget https://dora.promfacility.eu/releases/$VERSION/$TYPE/$PLATFORM/dora.exe
  else
    wget https://dora.promfacility.eu/releases/$VERSION/$TYPE/$PLATFORM/dora
  fi

  case "$OSTYPE" in
    darwin*)  mv dora /usr/local/bin/dora;; 
    linux*)   mv dora /usr/local/bin/dora;; 
  esac  
  chmod 755 /usr/local/bin/dora
fi

if [ $TYPE == "electronapp" ]
then
  if [ $PLATFORM == "win-x64" ] 
  then
    wget https://dora.promfacility.eu/releases/$VERSION/$TYPE/$PLATFORM/dora.exe
  else
    wget https://dora.promfacility.eu/releases/$VERSION/$TYPE/$PLATFORM/dora
  fi
fi

