# Commands Helper

## Bathroom management

#### /**bathrooms**

Returns a list with all bathrooms registered on database, that match with the used filters.

###### Options

| name        | type                       | description                       | required |
| ----------- | -------------------------- | --------------------------------- | -------- |
| id          | string                     | Filter by a specific ID.          | no       |
| campus      | [CampusType](#campus-type) | Filter by campus.                 | no       |
| institute   | string                     | Filter by institute.              | no       |
| floor       | integer                    | Filter by floor.                  | no       |
| have-shower | boolean                    | Filter by if have shower or not.  | no       |
| created-by  | [User](#user-type)         | Filter by the author of register. | no       |

#### /**new-bathroom**

Registers a new bathroom in the database.

###### Options

| name         | type                           | description                                              | required |
| ------------ | ------------------------------ | -------------------------------------------------------- | -------- |
| campus       | [CampusType](#campus-type)     | The campus that is located the bathroom.                 | yes      |
| institute    | string                         | The institute that is located the bathroom..             | yes      |
| floor        | integer                        | The floor of the building that is located the bathroom.. | yes      |
| have-shower  | boolean                        | If the bathroom have shower or not.                      | yes      |
| localization | string                         | A detailed description about how to get at the bathroom. | no       |
| images       | [Attachment](#attachment-type) | Some images of the bathroom                              | no       |

## Utility

#### /**ping**

Response with Pong!
---

### Specific Types

##### Campus type

Is some of these strings: "`Canela`" or "`Ondina`" or "`Vitória da Conquista`" or "`Federação`" or "`Camaçari`" or "`São Lázaro`"

##### User type

Is a Discord type, basically a mention or ID of the user.

##### Attachment type 

Is a Discord type, basically files that you can annex.