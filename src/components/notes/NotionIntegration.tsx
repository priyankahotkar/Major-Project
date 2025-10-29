import React from 'react';
import { ExternalLink, Settings, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface NotionIntegrationProps {
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onLoadContent: () => void;
  loading: boolean;
}

export const NotionIntegration: React.FC<NotionIntegrationProps> = ({
  connected,
  onConnect,
  onDisconnect,
  onLoadContent,
  loading
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 flex items-center">
          <ExternalLink className="w-5 h-5 mr-2" />
          Notion Integration
        </h2>
      </div>

      <div className="p-4">
        {connected ? (
          <div className="space-y-4">
            {/* Connected State */}
            <div className="flex items-center text-green-600">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Connected to Notion</span>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm text-green-800">
                Your Notion workspace is connected. You can now view and access your Notion pages and databases.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={onLoadContent}
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Settings className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Loading...' : 'Refresh Content'}
              </button>

              <button
                onClick={onDisconnect}
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Disconnect Notion
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Not Connected State */}
            <div className="flex items-center text-gray-500">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Not connected to Notion</span>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
              <p className="text-sm text-gray-600">
                Connect your Notion workspace to view and access your pages and databases directly from Mentor Connect.
              </p>
            </div>

            {/* Connect Button */}
            <button
              onClick={onConnect}
              disabled={loading}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Connecting...' : 'Connect Notion'}
            </button>

            {/* Info */}
            <div className="text-xs text-gray-500">
              <p className="mb-1">What you can do with Notion integration:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>View your Notion pages</li>
                <li>Browse your Notion databases</li>
                <li>Access content without leaving Mentor Connect</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
