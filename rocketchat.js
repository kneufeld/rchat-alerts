// this is the code for a rocket.chat integration that accepts a webhook from alertmanager

// relevant rocket.chat docs
// https://rocket.chat/docs/administrator-guides/integrations/
// https://rocket.chat/docs/developer-guides/rest-api/chat/postmessage/

class Script {

    // entry point for rocket.chat
    process_incoming_request({ request }) {
        // console.log(request.content);

        if(! request.content.hasOwnProperty('alerts')) {
            return {
                error: {
                    success: false,
                    message: "no alert property in message"
                }
            }
        }

        // if there are multiple alerts then break them up into
        // individual messages, otherwise convert alert to message
        
        if(request.content.alerts.length == 1) {
            return this._convert_alert(request);
        }

        if(request.content.alerts.length > 1) {
            for (i = 0; i < request.content.alerts.length; i++) {
                const new_req = this._crop_out_alert(request, i);
                this._repost_request(new_req);
            }
            
            // by returning nothing rocket.chat doesn't post a message
            // it does return a 200 response to the caller
            return;
        }

        // zero alerts?
        return {
            error: {
                success: false,
                message: "no alerts in message"
            }
        }
    }

    // convert an alert to a rocket.chat message
    _convert_alert(request) {
        const alert = request.content.alerts[0];

        return {
            content: {
                channel: this._channel(request),
                text: `${alert.annotations.identifier}: ${alert.labels.job} is ${alert.status}`,
                attachments: [{
                    // author_name: alert.labels.instance,
                    // title: `${alert.labels.alertname}:${alert.labels.service_name}`,
                    color: this._color(alert.status),
                    text: `\
                    *alert name:* ${alert.labels.alertname}
                    *instance:* ${alert.annotations.identifier}
                    *severity:* ${alert.labels.severity}
                    *message:* ${this._get_alert_msg(alert)}
                    *desc:* ${alert.annotations.description}
                    `
                }]
            }
        }
    }

    // make a copy of this request with only the nth alert in it
    _crop_out_alert(request, n) {
        request = JSON.parse(JSON.stringify(request)); // deep copy

        request.content.alerts = [
            request.content.alerts[n]
        ]
        return request;
    }

    _repost_request(request) {
        // console.log(request.url_raw) // url_raw is just the path, no scheme or hostname
        // console.log(request)
        // for modern server 
        webhook = request.headers['x-forwarded-proto']+"://"+request.headers.host+""+request.url.path
        // post single alert back to this integration
        HTTP("POST", webhook, {data: request.content})
    }

    _get_alert_msg(alert) {
        if( alert.status == 'firing') {
            return alert.annotations.fail_msg
        }
        return alert.annotations.restore_msg
    }

    _channel(request) {
        if( request.content.hasOwnProperty('channel'))
            return request.content.channel;

        if( request.hasOwnProperty('commonLabels'))
            if( request.commonLabels.hasOwnProperty('channel') )
                return request.commonLabels.channel;

        return undefined;
    }

    _color(status) {
        if( status == "resolved" )
            return "good";

        if(status == "firing")
            return "danger";

        return "warning";
    }
}
