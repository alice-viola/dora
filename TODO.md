# PWM Todo List

## PWM:APP

- Apply with form, from parsed YAML
- Upload and Download to volumes
- Complete user managment view
- Edit the spec of every resource in ResourceDetail
- Charts on nodes and workloads
- Fix bug with user switch in store/index.js
- Volume files ispector
- Check issue on page reload

## PWM:CONTROLPLANE:API

### Security

- Implement history metric collection, metric server
- Implement cluster CA 
- Certificate and join token generation
- Check user spec.id in token auth

### Feature

- Labels selector
- Fix bug in cp non existent folder
- Allow user to insert docker credentials
- Check storage and volumes limits
- Define weekly user limits with credits

### Next

- Check Binds on resource deletion
- Allow to run custom scheduler  
- Network managment
- Cluster wide events with NATS
- Messenger by NATS Events
- Split scheduler from API

## PWM:DOC

- Create admin documentation
- Divide user documentation from admin and setup documentation
- Create documentation for examples and How-To
- Create video on App use

## PWM:NODE

- Fix bug if driver not exist
- Join to master

## Operations

-  Move to Docker Hub registry