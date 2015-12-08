# StackStorm Single Host Deployment


**Disclamer:** *This is an un-official, unfinished, Ubuntu-14.04 based guide. Will be [eventually] translated to the proper docs.*


StackStorm's single host reference deployment is delivered by [All-In-One installer aka AIO](https://docs.stackstorm.com/latest/install/all_in_one.html).

*If you're looking for quick smooth start with StackStorm, go to AWS, create Ubuntu AMI [ami-5189a661](https://us-west-2.console.aws.amazon.com/ec2/v2/home?region=us-west-2#Images:visibility=public-images;imageId=ami-5189a661;) and [run the installer](https://docs.stackstorm.com/install/all_in_one.html). If you care to learn what's under the hood, read on.*

Here I describe some details of this reference deployment  with examples of configurations, and pointers to puppet modules in [puppet-st2](https://github.com/StackStorm/puppet-st2) and [st2workroom](https://github.com/StackStorm/st2workroom) that are used to deploy it. Using this as a map of StackStorm's dependencies, components, and configurations, you can reason about the setup and configuration, troubleshoot problems, contribute patches, or reverse engineer installer for DYI deployment, either using StackStorm Puppet modules directly or as a reference points. **NOTE: this description is for Ubuntu 14.04;** RedHat deployment is similar but OS specific details obviously differ; puppet pointers handle both systems so you could figure it out.

## Big Picture

<img src="https://docs.google.com/drawings/d/1B_kgwbWfo0ByRELkBzvP8mqODq12OjSiyhW8A6mjG3Y/pub?w=960&amp;h=720">

TODO: short word description

### External dependencies:

* RabbitMQ (AIO installs uses as a docker image)
* MongoDB 2.4 (AIO installs as a docker image)
* gunicorn or uwsgi
* PostgreSQL
* nodejs, npm, hubot (optional, required for Chatops) 
* Reddis or Zookeeper (optional, required for Policies)
* LDAP (optional, for LDAP based authentication)


## Frontent
1. nginx provides SSL termination, redirects HTTP to HTTPS, serves WebUI as static HTML, and proxies REST API endpoints to st2* web services. Configurations [/etc/nginx/](./etc/nginx/), 
or [see puppet](https://github.com/StackStorm/st2workroom/blob/master/modules/profile/manifests/st2server.pp)

    CORS: Currently, api and auth endpoints are served off port 9100 and 9101. As these endpoints are accessed from a browser, CORS need to be properly handled on nginx. You can see quite a bit of settings to handle brower's pre-flight OPTION requests. ***Coming soon:*** we are moving to serving everything off a single HTTPS port.
    
    SSL certificate is at `/etc/ssl/st2/` (`st2.crt`, `st2.key`). The certificate commonname or alt names shall match the external address used to access StackStorm on the box.

2. StackStorm WebUI (st2web and flow) is served as static HTML. Nginx configuration at [/etc/nginx/sites-enabled/st2webui.conf](./etc/nginx/sites-enabled/st2webui.conf). Static content is under `/opt/stackstorm/static/webui/`. The [config.js](./opt/stackstorm/static/webui/config.js) there defines the API endponts URL according to [rfc1808](http://tools.ietf.org/html/rfc1808.html), as well as the relative path to flow.

2. gunicorn and uwsgi are used to run st2 web services. Installed via pip, globally. Hint: use gunicorn - we are migrating away from uwsgi.
    * gunicorn: runs st2api, will soon be used to run st2install, st2auth, and mistral api. Upstart script template for st2* services - see [puppet](https://github.com/StackStorm/st2workroom/blob/master/modules/adapter/templates/st2_gunicorn_init/init.conf.erb)
    * uwsgi: still used to run st2auth. Upstart script template for uwsgi - [see puppet](https://github.com/StackStorm/st2workroom/blob/master/modules/adapter/templates/st2_uwsgi_init/anchor.conf.erb)

## st2* components

* st2* are python st2 service components that comprise main StackStorm functionality. They are installed from .deb or .rpm packages at [https://downloads.stackstorm.net](https://downloads.stackstorm.net/releases/st2). Currently the packages do not include python pip dependencies. Therefore, python pip requirements must be installed from pip during deployment. (example here).
    * [stackstorm-st2 on PuppetForge](https://forge.puppetlabs.com/stackstorm/st2).
    * Puppet code under [StackStorm/puppet-st2](https://github.com/StackStorm/puppet-st2/tree/master/manifests/profile).
* Most st2* components are connected to RabbitMQ and MongoDB; the connections are configured in `/etc/st2.conf` ([see docs](https://docs.stackstorm.com/config/config.html#configure-mongodb)).
* Other common configurations in `/etc/st2.conf`. Note that some parameters are used in "debug" mode and not relevant when run under nginx/gunicorn.
* upstart scripts are in [/etc/init](./etc/init) - ([see puppet](https://github.com/StackStorm/puppet-st2/tree/master/files/etc/init.d))
* [`st2ctl`](https://github.com/StackStorm/st2/blob/v1.2/tools/st2ctl) is a convinience command to operate StackStorm.
    * NOTE: when you run `st2ctl status` and see `st2web is not running` - don't worry: it's not used in the ref deployment as WebUI and Flow are served by nginx.


1. ### [st2installer](https://github.com/StackStorm/st2installer) 
    st2installer is a small Pecan app that serves a graphical setup for All-In-One installer over HTTPS. Only used by all-in-one installer.

2. ### [st2auth](https://github.com/StackStorm/st2/tree/master/st2auth)
st2auth is an authentication Web service. It is a Pecan app, running behind nginx on port 9100, with gunicorn (recommended, will update soon) or uwsgi (current).
    * nginx configuration in [/etc/nginx/sites-enabled/st2auth.conf](./etc/nginx/sites-enabled/st2auth.conf) and [/etc/nginx/uwsgi_params](./etc/nginx/uwsgi_params)
    * uwsgi upstart script [/etc/init/st2auth.conf](./etc/init/st2auth.conf) - ([puppet template](https://github.com/StackStorm/st2workroom/blob/master/modules/adapter/templates/st2_uwsgi_init/init.conf.erb))
    * Ref deployment uses PAM auth backend; [st2-auth-backend-pam](https://github.com/StackStorm/st2-auth-backend-pam) needs to be installed from [downloads.stackstorm.net/st2community](https://downloads.stackstorm.net/st2community/apt/jessie/auth_backends/) ([puppet](https://github.com/StackStorm/puppet-st2/blob/master/manifests/auth/pam.pp)); 
    * the configuration is in [auth] section of [/etc/st2/st2.conf](./etc/st2/st2.conf). Note that `use_ssl=False` is because nginx is doing SSL termination, so st2auth doesn't have to. 
    * to set up a different authentication backends, [follow docs](https://docs.stackstorm.com/authentication.html)

3. ### [st2api](https://github.com/StackStorm/st2/tree/master/st2api)
st2api is the REST API Web service, also serves webhooks for webhook triggers. It's a pecan app running behind nginx on 9101 via gunicorn.
    * nginx configuration in [/etc/nginx/sites-enabled/st2api.conf](./etc/nginx/sites-enabled/st2api.conf) Note that we are switching to proxying it over HTTPS:443 soon.
    *  gunicorn upstart script [/etc/init/st2api.conf](.//etc/init/st2api.conf) - ([puppet template](https://github.com/StackStorm/st2workroom/blob/master/modules/adapter/templates/st2_gunicorn_init/init.conf.erb))

4. ### [st2sensorcontainer](https://github.com/StackStorm/st2/blob/master/st2reactor/st2reactor/cmd/sensormanager.py)
st2sensorcontainer runs sensor plugins from `/opt/stackstorm/packs`. Sensors from the packs need to be registered; this is done when pack is installed by `packs.install`, or manually manually by `run st2ctl reload --register-sensors`. Deployed with `st2reactor` package.

5. ### [st2rulesengine](https://github.com/StackStorm/st2/blob/master/st2reactor/st2reactor/cmd/rulesengine.py)
This picks triggers from the RabbitMQ, matches them against the active Rules, and sends an action requests to RabbitMQ. Deployed with `st2reactor` package.

6. ### [st2actionrunner](https://github.com/StackStorm/st2/blob/v1.2/st2actions/st2actions/cmd/actionrunner.py)
st2actionrunner runs action plugins from `/opt/stackstorm/packs` via a [variety of runners](https://docs.stackstorm.com/actions.html#available-runners). Deployed with `st2actions` package. Different runners relies on different configuration settings to operate.
    * Running 4 `st2actionrunner` processes per core is a good empirics. With Ubuntu upstart: number of `st2actionrunner-worker*` is created in `/etc/init/` which are all controlled by [`/etc/init/st2actionrunner.conf`](./etc/init/st2actionrunner.conf) - ([see puppet](https://github.com/StackStorm/puppet-st2/blob/v0.10.18/manifests/profile/server.pp#L341)).
    * Actions based on `remote-shell-runner` and `remote-command-runner` require proper SSH setup [per docs](https://docs.stackstorm.com/config/config.html#configure-ssh); `[system_user]`, `[ssh_runner]` in ,
    * Mistral runner needs access to Mistral API endpoint ([see docs for more options](https://docs.stackstorm.com/config/config.html#configure-mistral))
    * Python runner creates a virtualenv environment per pack under `/opt/stackstorm/virtualenvs`; it is handled by `packs.install`; set it up manually with `packs.setup_virtualenv` when writing your custom pack.
    * If [policies](https://docs.stackstorm.com/policies.html) used, a coordination service is needed. Redis is recommended for for single-box deployment, or use an external Redis or Zookeepr.

7. ### st2resultstracker
A service for tracking long-running workflow executions. Deployed as part of st2actions package. Calls Mistral API endpoint.

8. ### st2notifier
A service for providing [notifications](https://docs.stackstorm.com/chatops/notifications.html) that fires `core.st2.generic.notifytrigger` on action completions. Deployed as part of `st2actions` package. 

## Mistral
TODO: coming...

## Chatops
TODO: coming...



