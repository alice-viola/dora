let Docker = require('dockerode')
var docker = new Docker()
var container;
var containerId;

docker.createContainer({
        Image: 'ubuntu',
        Tty: true,
        //AttachStdout: true,
        //AttachStderr: true,
        Cmd: ['/bin/bash'],
        //OpenStdin: true,
    }, function (err, container) {
        if (err) return;
        console.log(container.id)
        container.start({}, (err, data) => {
            command(container)
            console.log("Started: ", err, data);
        })
})

function command(container) {
    console.log('Exec')
    var options = {
        'AttachStdin': true,
        'AttachStdout': true,
        'AttachStderr': true,
        'Tty': true,
        Cmd: ["/bin/bash"]
    };
    container.exec(options, function (err, exec) {
        console.log(err)
        if (err) return;
    
        var attach_opts = { stdin: true, hijack: true}
        exec.start(attach_opts, function (err, stream) {
            if (err) return;
            process.stdin.setEncoding('utf8')
            process.stdin.pipe(stream)
            stream.setEncoding('utf8')
            stream.pipe(process.stdout)
        });
    });
}