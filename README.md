# Rocket.Chat Integration

`rchat-alerts` converts an [alertmanager](https://prometheus.io/docs/alerting/alertmanager/)
webhook into a series of [Rocket.Chat](https://rocket.chat/) messages.

*Features:*

* converts the array of alertmanager alerts into individual messages
* nicely formats the alert
* the desktop/web notification has proper text instead of just `prometheus uploaded a file`

I found the `slack_api` integration in `alertmanager` extremely difficult to use. Even
though I'm not fan of javascript it was significantly easier to customize the rchat
message with `js` than in the `golang` template language.

## installation

You'll probably have to tweak the function `_convert_alert` in
`rocketchat.js` to fit your `prometheus` installation. But do this basic
install first to get started.

### rocket.chat

* create a `rocket.chat` integration (Admin → Integrations → New → Incoming Webhook)
* save the integration (this creates the `Webhook URL` which you'll need below)
* edit `rocketchat.js` from this repo
  * `THIS_WEBHOOK` should equal `Webhook URL` from the integration
  * `DEFAULT_CHANNEL` should equal `Post to Channel` from the integration
* edit the integration, enable the script
* paste edited file `rocketchat.js` into `script` text box
* save the integration

Optionally edit `alerts.py` while you're at it.


### alertmanager

Edit `alertmanager.yaml` as appropriate and restart/reload it.

```yaml
# alertmanager.yaml

routes:
  ...
  receiver: rocketchat

receivers:
  - name: rocketchat
    webhook_configs:
      - send_resolved: true
        url: <change me as appropriate>
```

## testing

Test with one of the supplied data files or follow the next step to get your own.

```
curl -X POST -H "Content-Type: application/json" -d @data/from-alertmanager.json THIS_WEBHOOK
```

Edit `alert.py` with proper webhook url or use `--url URL` on command line.

```
./alert.py --url webhook_url data/single-alert.json

# after editing alert.py
./alert.py @from-alertmanager.json
```

### data files

This step is optional but it's nice to work with your own data.

* edit `alertmanager.yaml` and change `url` to `localhost:9977`
* reload `alertmanager`
* in a terminal run `nc -k -l localhost 9977`
* force an alert

```
# example to force alert
systemctl stop node_exporter.service
sleep 310
systemctl start node_exporter.service
```

You should get output on `nc` when the alert fires. Save `json` to a file
and test with it. Don't forget to revert `alertmanager.yaml`.


## prometheus

Here's an example of a rule that sets some labels.

```
# prometheus.yaml

...

  - job_name: 'node_exporter'
    scrape_interval: 60s
    scrape_timeout:  10s
    consul_sd_configs:
      - server: localhost:8500
        datacenter: west
    relabel_configs:
      - source_labels: ['__meta_consul_tags']
        regex: '(.*)node_exporter(.*)'
        action: keep
      - source_labels: ['__meta_consul_node']
        target_label:  'instance'
      - source_labels: ['__meta_consul_dc']
        target_label:  'group'
```

```
# rules/node.yaml

groups:

- name: node-checks

  rules:

  - alert: node-down
    expr: probe_success{job=~"ping.*"} == 0
    for: 2m

    labels:
      severity: error

    annotations:
      identifier: "{{ $labels.instance }}.{{ $labels.group }}"
      description: "could not ping host"
      fail_msg: "is down"
      restore_msg: "is back up"
```
