#!/usr/bin/env python

import os
import sys
import requests
import argparse

THIS_WEBHOOK = 'CHANGE ME TO YOUR WEBHOOK URL'

def parse():
    parser = argparse.ArgumentParser()

    parser.add_argument("--url", default=THIS_WEBHOOK, help="rocket.chat webhook url")
    parser.add_argument("fname", help="json file to send")

    return parser.parse_args()

def main():
    args = parse()

    with open(args.fname) as f:
        msg = f.read()

    resp = requests.post(args.url, data=msg)

    if resp.status_code != 200:
        # import pudb; pu.db
        print(resp.json()['error'])
        sys.exit(1)

if __name__ == '__main__':
    main()
