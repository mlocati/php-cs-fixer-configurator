const mix = require('laravel-mix');
const htmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const fs = require('fs');

mix
    .disableNotifications()
    .setPublicPath('docs')
    .ts('web/app.ts', 'js/app.js')
    .extract()
    .sass('web/app.scss', 'css/app.css')
    .webpackConfig({
        plugins: [
            new htmlWebpackPlugin({
                template: 'web/index.html',
                filename: 'index.html',
                hash: true,
                xhtml: true,
            }),
        ],
    })
    .then(() => {
        const indexFilename = path.resolve(__dirname, 'docs/index.html');
        let indexContents = fs.readFileSync(indexFilename, 'utf8');
        indexContents = indexContents.replace(/(<link\b[^>]*\shref=["']?)\/+/g, '$1');
        indexContents = indexContents.replace(/(<script\b[^>]*\ssrc=["']?)\/+/g, '$1');
        fs.writeFileSync(indexFilename, indexContents, 'utf8');
        const cssFilename = path.resolve(__dirname, 'docs/css/app.css');
        let cssContents = fs.readFileSync(cssFilename, 'utf8');
        cssContents = cssContents.replace(/(\burl\s*\(\s*["']?)\/?(fonts\/)/g, '$1../$2');
        fs.writeFileSync(cssFilename, cssContents, 'utf8');
    })
    ;
