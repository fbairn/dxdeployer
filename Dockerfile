FROM salesforce/salesforcedx:7.137.1-full
RUN export SFDX_AUTOUPDATE_DISABLE=false
RUN export SFDX_DOMAIN_RETRY=300

RUN mkdir /ciscript
WORKDIR /ciscript
ADD package.json package.json

RUN npm install

ADD . .