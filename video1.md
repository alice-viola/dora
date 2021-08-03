## Intro

Hi guys,

today we will try to explain to you the new system
developed for our cluster. 

This system is called Dora, and it has a lot of interesting
feature.

As PWM, it has both a CLI a and a Web interface,
but it also have a desktop application.

For this tutorial we will try all the three interfaces.

## Webapp

We start by signin to the system in the web interface,
using the token that we have provided to you. 

Once inside you will see this dashboard panel:
this panel allow you to do all the operations you will need
in order to manage your workloads.

As you can see there are five columns: 
in the fist one you will define and control your
workloads, in the other four you will see the status
of the container owned by each workload.

This is the main difference between PWM and Dora:
you create workloads, and the system will create
one or more Docker container.

Start creating the first workload, click on "Create the first workload"
on the first column.

A new dialog will popup, the so called "Workload editor".
With this panel you can set everything about your experiments.

You can set the name of the experiment here,
and configure the workload using the menu on the left.
Keep the number of instances to zero for the moment.
Setup the base image, the pull policy and the start command.

Next move the hardware section: select or the CPU or the GPU
tab, and choose all the suitable hardware kind: the Dora
scheduler will assign to your workload one of the available 
choosen resources. Then select the number, per container,
of resources. In case of the cpu workload, you can also set
millicores values.

On the data sync section, you can attach your volumes and the 
dataset volumes. By default the mount path will be the name 
of the volume under root.
We will analyze the "sync code" function with the Desktop app version.

If you need to do distribute training, so if you need that
your containers will be able to communicate between diffrent nodes,
you can go to the network tab, and select the proper mode.
By default the policy is "none", but you can select "bridge" mode,
where you can setup some open ports, or host mode, where the container
will have all the networks of the node. The host mode requires special
permission, so you will have to ask to us to enable it for you in case
you need it.

Last one, the scheduler tab. You can choose the trategy used by the scheduler
for this workload, between First, Random, Distribute and Fill.
Unless you want that your workloads will be restarted every time they die,
keep the restart policy to Never. 

We are ready to run the workload so, click the green save button icon on the top right!


Back to the control panel, you see the new created workload, with the replica indicator
fixed to 0/0. Click on the plus button or drag the workload to the To Run column:

a new container will be scheduled, and in few seconds you will see it on the Running column.

What if we do this again?

A new contianer is created again, and you see the replica indicator 2/2.

Click on the shell button, choose the right shell, and then connect to the container.

Play with it.

I have some code on my volume, called code.dora, so I go to this folder,
and try to launch an experiment.
As you can see I choose the wrong base image, so I need to change it in
order to use python.
No worry, close the shell, go to the workload editor, and change it.
The scheduler will see there is a difference between the current running
containers and the new desired state, so it will recreate all the containers
to match the new desired state.

Connect again and launch the simulation.

What if you mess up with a container and you want to restart it? 
Press the reload button. In max 20 seconds you will have a new fresh container.
What if you want to delete a container?
Press the trash button. As you can see, the system has scaled down the replica count.
You can do the same operation using the minus button on the workload card.

We recereate again the replicas, and then press the stop button on the workload:
this will stop all the containers, but it will keep the workload definition,
so you can run it again when you need, without have to recreate a workload with
the same settings.

Furthermore, if you go the versions panel, you can reload a previus version.
When you want to delete a workload, simply press the red bin button.

Check the navbar for a moment:
you can see a Zone menu, where you can select the zone, and a workspace
menu. Every one of you have a private workspace, and you can clone it,
in order to better organize your projects.

On the right you see the used credits indicator. 
You can also apply YAML files using the text button.


## CLI

Ok, switch to the CLI.
Once you have installed and configured it,
you can start to check and create things like in the webapp.
It's very similar to the previus pwmcli, so I will focus
on the sync function. The sync function will sync in real time
code from your PC to a volume in Dora. So you can edit
the code on your PC and than try it on a container on Dora.


## Desktop app

The desktop app is the same webapp, plus the access 
to your filesystem, so it can read your Dora profiles,
and sync the files in auto for you.
To activate a sync, go to the workload editor,
and configure how many sync folder you want.
When tou save, you see a spinning icon on the workload,
it means the system is syncing your folder to the container.


## End

So guys, this is brief introduction to the new feature
of Dora. As alwasys if you have issues contact us on Discord,
and more importantly, let us know what you think about it!






