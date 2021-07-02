## Add odoo user login button

- In the template, include "conn_admin.html" as following :

```
{% block content %}
  {% include "common/conn_admin.html" %}
```

- In the JS code, use the following pattern (for example) :
```
$(document).ready(function() {
    if (coop_is_connected()) {
     .....
    }
}
```