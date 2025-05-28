// index.js
'use strict';

const { app } = require('./handler');

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`OAuth Server listening on port ${port}`);
});
