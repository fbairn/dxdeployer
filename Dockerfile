FROM salesforce/salesforcedx:7.119.3-full
RUN export SFDX_AUTOUPDATE_DISABLE=false
RUN export SFDX_DOMAIN_RETRY=300

RUN mkdir /ciscript
WORKDIR /ciscript
ADD . .

RUN npm install