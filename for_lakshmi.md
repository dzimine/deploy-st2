[!] `st2ctl status` shall not have root privileges: st2ctl status, st2ctl reload are things that a non-admin user may likely need.

[!] st2client needs to be available as a separate package ASAP. When we install, shall we do apt-get install st2 st2mistral st2client, or make it part of bundle?

[!] st2chatops as a package

[?]  For each of this, specify why it must be installed by the user (as opposed to by package dependency) and why each of them is needed (may be have it when 
```sudo apt-get install -y wget apache2-utils apt-transport-https sysvinit-utils```

[?] Allow localhost connections to rabbitmq:
```echo '[{rabbit, [{disk_free_limit, 10}, {loopback_users, []}]}].' | sudo tee /etc/rabbitmq/rabbitmq.config```

I am -1 on polluting the guide with this and similar corner-case hacks. It is obvious We can do KB, references to rabbitMQ, footnotes, and script

[BUG] st2mistral broken: the version is 1.2.0-1, description is wrong/obsolete (didn't we repurpose it to be  "stack storm's mistral", not a plugin?), what is `python-mistral`.. and I couldn't install it even with dpgk

[ASK] Make sure out-of-box content is registered as part of installation, don't put that on user. After I installed st2, content is in place but not registered, I need to run st2ctl reload to get it. 

[?] st2-register-content with services down will generally not work. Throws errors when registering the rules: TriggerDoesNotExistException: A simple trigger should have been created when registering triggertype. Cannot create trigger: {'type': 'core.st2.generic.notifytrigger'... For out-of-box installation so far it works... by luck.

[ASK] Disable auth in a package. This way it works out of box. Change /etc/st2/st2.conf [auth] enable=False. Make "configure Auth" a separate step in installation flow, after everything has worked once. 

[ASK] Add PAM (st2-auth-backend-pam) to default st2 installation. As a first time user, I may choose to configure PAM vs flat file, just because of my preferences. We shouldn't be in the way.
   * Install PAM backend by default, too; spare a user from the trouble of getting it from git.  
   * add a commented out PAM config sample to /etc/st2/st2.conf
   * BTW where is the base st2.conf file comes from and is this script still being used? 
   
[ASK] use stable for 1.3, unstable for 1.4dev, focus on 1.3 - we first reviel new packages on 1.3 (discussed in the office)
