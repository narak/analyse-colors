<html>
<link rel="preconnect" href="https://fonts.gstatic.com">
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@100;400&display=swap" rel="stylesheet">
<style>
    html,
    body {
        margin: 0;
        padding: 0;
        font-family: 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    }

    body {
        padding: 35px 20px;
    }

    .grid-container {
        display: grid;
        grid-template-columns: repeat(10, 1fr);
        column-gap: 20px;
        row-gap: 20px;
        margin-bottom: 100px;
    }

    .grid-container>div {
        text-align: center;
        position: relative;
    }

    .grid-color-display {
        display: inline-block;
        margin: auto;
        width: 60px;
        height: 60px;
    }

    .grid-color-count {
        background: #000;
        color: #fff;
        font-size: 12px;

        border-radius: 50%;
        line-height: 20px;
        width: 20px;

        position: absolute;
        top: -7px;
        right: 20px;
    }

    /* Add this attribute to the element that needs a tooltip */
    [data-tooltip] {
        position: relative;
        cursor: pointer;
    }

    /* Hide the tooltip content by default */
    [data-tooltip]:before,
    [data-tooltip]:after {
        visibility: hidden;
        opacity: 0;
        pointer-events: none;
    }

    /* Position tooltip above the element */
    [data-tooltip]:before {
        position: absolute;
        top: 83px;
        left: 50%;
        margin-bottom: 5px;
        margin-left: -80px;
        padding: 7px;
        color: #000;
        content: attr(data-tooltip);
        text-align: left;
        font-size: 14px;
        z-index: 2;
        overflow: visible;
        background: #f1f1f1;
        border-radius: 3px;
        width: 400px;
    }

    /* Show tooltip content on hover */
    [data-tooltip]:hover:before,
    [data-tooltip]:hover:after {
        visibility: visible;
        opacity: 1;
    }
</style>

<body>
    <h2>Colors: {{colorCount}} | Clusters: {{clusterCount}}</h2>
    {{colors}}
</body>

</html>