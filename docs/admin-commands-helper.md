# Admin commands Helper

\*_These commands, only users that have theys id in BOT_ADMINS environment variable can use._

## Arguments and Parameters explanation

**\*Arguments** are separated by spaces (one or more) and positioned starting by 1

```diff
                 v    v -> separators
+ _mycommand arg1 arg2 arg3 ...
                ^    ^    ^ -> positions of each arg in arguments list
```

The same command, now with **Parameters**

```diff
             v -> param initializator      vvvvvvvvvvv -> param name
+ _mycommand -param_name1="param value 1" -param_name2="param value 2" ...
                         ^ -> param assigner            ^^^^^^^^^^^^^ -> param value
```

> _Arguments are ordered and need to be in order to be correctly read by the command executor._

> _Parameters are named, and do not need to be in order, but require more verbosity when calling the command._

\*_Some commands may require only arguments or only parameters._

#### /**cleardb**

Clear a specific collection of the database

###### Arguments/Parameters

| name       | type   | position in arguments list | description                                         | required |
| ---------- | ------ | -------------------------- | --------------------------------------------------- | -------- |
| collection | string | 1                          | The name of the collection that you want to delete. | yes      |

#### /**deploy**


Deploy the bot commands to the discord API so that commands are visible in the interface.

