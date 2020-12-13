---

# Web Interface

!> The web app is under revision, so the layout, the color scheme and some other things will change in the next release.

## Accessing 

Open a browser and go to your api server.

Insert the same token you used for the CLI.

![Arch PWM](../images/web/login.png)


## Layout

Once signin, you will find a Progressive Web App, with a Navbar and a Sidebar.
The content in the sidebar dependes on your roles and permissions.

![Arch PWM](../images/web/dashboard.png)


## Editor

On the top-right navbar section, you will find two important buttons:

- The NEW button
- The profile button selector

Normal users should not care about the profile button.

If you click on the *NEW* button, an YAML editor will appear: you can paste the code you want and apply it,
like you do with the CLI.


![Arch PWM](../images/web/editor.png)

Once you have applied a Workload, go to the next section.

## Workloads

Clicking on the Workload on sidebar, you will see your running or paused workloads. 
You can stop/delete/pause/resume/connect to each workload by click the corresponding action on the workload row.


![Arch PWM](../images/web/workloads.png)
