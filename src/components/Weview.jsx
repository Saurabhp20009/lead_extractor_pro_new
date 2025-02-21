import React from 'react';

function WebViewComponent({ url }) {
    return (
        <webview src={url} style={{ width: '800px', height: '600px' }}></webview>
    );
}

export default WebViewComponent;
