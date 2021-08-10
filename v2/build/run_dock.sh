#!/bin/bash

git clone https://github.com/adda25/dora/tree/develop
cd dora
cd build
npm install
DEBUG=true node index.js build webapp api scheduler #-v 0.8.0 -r doraai


### # /etc/fstab: static file system information.
### #
### # Use 'blkid' to print the universally unique identifier for a
### # device; this may be used with UUID= as a more robust way to name devices
### # that works even if disks are added and removed. See fstab(5).
### #
### # <file system> <mount point>   <type>  <options>       <dump>  <pass>
### # / was on /dev/sda2 during installation
### UUID=b83c3821-7eac-418a-bbcc-504e71f8a93c /               ext4    errors=remount-ro 0       1
### # /boot/efi was on /dev/sda1 during installation
### UUID=FC4C-9EB6  /boot/efi       vfat    umask=0077      0       1
### 
### # Uncomment the next line to mount raid on /raid
### /dev/sdb1 /home ext4 defaults,nofail 0 2
### /dev/sdb2 /data ext4 defaults,nofail 0 2