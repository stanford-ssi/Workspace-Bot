## Overview:
Read about the use of this software [here](URL "https://lawtonskaling.sites.stanford.edu/news/workspace-bot")

Workspace bot was developed for the Stanford Student Space Initiative (SSI) Slack, to provide a variety of easy to access functions related to workspace organization

1. Everyone with ESIII access is required to do a workspace cleaning to maintain a tidy environment for productive engineering. This can be done during a workspace clean event or asynchronously. The bot tracks member’s cleaning, sends them reminders, and lets members log cleanings done outside of a workspace clean event for credit
2. Members can make workspace requests that are sent directly to workspace managers. It improved tracking over sending suggestions via DMs, and keeps members in the loop as a request is fulfilled. 
3. SSI allows members to borrow equipment for outside projects. The bot logs what items members have borrowed, reminds them to return it, and ensures members are not taking equipment out of the lab that may be used

## How it works

The app is built on Node JS with the Slack Bolt framework. It’s hosted on Heroku, alongside a JawsDB database. Some features are easier viewed in a spreadsheet than on Slack, so for those data is stored on a Google Sheet and the bot accesses them via the sheets API. 

## History:

The workspace bot was first implemented summer of 2022 after Lawton and Matthew decided to implement a workspace cleaning requirement, to make tracking it easier on their part and more seamless for all SSI users. It was met with mixed success. The workspace became much improved, with a record 30 people doing workspace cleanings (when they were offered previously, fewer than 10 would usually show up). However some features, such as the requests, were not widely publicized and thus rarely used. Furthermore the implementation of Google Sheets API stopped working partway through the quarter, and thus we resorted to manually logging when people completed a requirement via DM. A number of new opportunities presented themselves after trying the software, such as a way to confirm people’s attendance was recorded

Lawton re-wrote the software winter break of 2022. The tools to log who borrowed equipment was added, and new features were implemented to track who completed workspace cleanings, and make communication clear when someone did. It was also migrated from AWS to Heroku, to better align with other servers hosted by SSI and make deployment easier.
