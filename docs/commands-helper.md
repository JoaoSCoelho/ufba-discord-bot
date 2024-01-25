# Commands Helper

## Bathroom management

#### /**bathrooms**

Returns a list with all bathrooms registered on database, that match with the used filters.

###### Options

| name        | type                       | description                                    | required |
| ----------- | -------------------------- | ---------------------------------------------- | -------- |
| id          | string                     | Filter by a specific ID.                       | no       |
| campus      | [CampusType](#campus-type) | Filter by campus.                              | no       |
| institute   | string                     | Filter by institute.                           | no       |
| floor       | integer                    | Filter by floor.                               | no       |
| have-shower | boolean                    | Filter by if have shower or not.               | no       |
| created-by  | [User](#user-type)         | Filter by the author of register.              | no       |
| have-image  | boolean                    | Filter only bathrooms with at least one image. | no       |

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
| image        | [Attachment](#attachment-type) | Some image of the bathroom                               | no       |

#### /**add-bathroom-images**

Adds new images to a specific bathroom.

\*The maximum quantity of images on a bathroom is 25

###### Options

| name     | type                           | description                                        | required |
| -------- | ------------------------------ | -------------------------------------------------- | -------- |
| id       | string                         | The ID of the bathroom that you want to add images | yes      |
| image-1  | [Attachment](#attachment-type) | A image of the bathroom                            | yes      |
| image-2  | [Attachment](#attachment-type) | A image of the bathroom                            | no       |
| image-3  | [Attachment](#attachment-type) | A image of the bathroom                            | no       |
| ...      | ...                            | ...                                                | ...      |
| image-20 | [Attachment](#attachment-type) | A image of the bathroom                            | no       |

#### /**edit-bathroom**

Edits a specific bathroom.

\*Only the bathroom register creator or a bot admin can edit a bathroom.

###### Options

| name           | type                       | description                                              | required |
| -------------- | -------------------------- | -------------------------------------------------------- | -------- |
| id             | string                     | The id of the bathroom that you want to edit             | yes      |
| campus         | [CampusType](#campus-type) | The campus that is located the bathroom.                 | no       |
| institute      | string                     | The institute that is located the bathroom..             | no       |
| floor          | integer                    | The floor of the building that is located the bathroom.. | no       |
| have-shower    | boolean                    | If the bathroom have shower or not.                      | no       |
| localization   | string                     | A detailed description about how to get at the bathroom. | no       |
| main-image-url | string                     | A URL from a image of the bathroom will be the main.     | no       |

#### /**remove-bathroom-images**

Removes some images from a specific bathroom.

\*Only the bathroom register creator or a bot admin can remove images from a bathroom.

All images will appear with two buttons: `Cancel` and `Delete`, the button `Cancel` unselect the image, while the button `Delete` selects the image. The images will be removed only when you click in `Confirm` button in end of chat.

###### Options

| name | type   | description                                  | required |
| ---- | ------ | -------------------------------------------- | -------- |
| id   | string | The id of the bathroom that you want to edit | yes      |

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
