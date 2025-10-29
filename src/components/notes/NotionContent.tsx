import React, { useState } from 'react';
import { FileText, Database, Calendar, ExternalLink, Loader, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface NotionPage {
  id: string;
  title: string;
  url: string;
  created_time: string;
  last_edited_time: string;
}

interface NotionDatabase {
  id: string;
  title: string;
  url: string;
  created_time: string;
  last_edited_time: string;
}

interface NotionContentProps {
  pages: NotionPage[];
  databases: NotionDatabase[];
  selectedContent: any;
  onPageSelect: (pageId: string) => void;
  onDatabaseSelect: (databaseId: string) => void;
  loading: boolean;
}

export const NotionContent: React.FC<NotionContentProps> = ({
  pages,
  databases,
  selectedContent,
  onPageSelect,
  onDatabaseSelect,
  loading
}) => {
  const [activeTab, setActiveTab] = useState<'pages' | 'databases'>('pages');

  const renderNotionBlock = (block: any, index: number) => {
    const { type, id } = block;
    
    switch (type) {
      case 'paragraph':
        return (
          <p key={id || index} className="mb-2 text-gray-700">
            {block.paragraph?.rich_text?.map((text: any, i: number) => (
              <span
                key={i}
                className={
                  text.annotations?.bold ? 'font-bold' :
                  text.annotations?.italic ? 'italic' :
                  text.annotations?.code ? 'font-mono bg-gray-100 px-1 rounded' : ''
                }
              >
                {text.plain_text}
              </span>
            ))}
          </p>
        );
      
      case 'heading_1':
        return (
          <h1 key={id || index} className="text-2xl font-bold text-gray-900 mb-4">
            {block.heading_1?.rich_text?.map((text: any, i: number) => text.plain_text).join('')}
          </h1>
        );
      
      case 'heading_2':
        return (
          <h2 key={id || index} className="text-xl font-semibold text-gray-900 mb-3">
            {block.heading_2?.rich_text?.map((text: any, i: number) => text.plain_text).join('')}
          </h2>
        );
      
      case 'heading_3':
        return (
          <h3 key={id || index} className="text-lg font-medium text-gray-900 mb-2">
            {block.heading_3?.rich_text?.map((text: any, i: number) => text.plain_text).join('')}
          </h3>
        );
      
      case 'bulleted_list_item':
        return (
          <li key={id || index} className="mb-1 text-gray-700">
            {block.bulleted_list_item?.rich_text?.map((text: any, i: number) => text.plain_text).join('')}
          </li>
        );
      
      case 'numbered_list_item':
        return (
          <li key={id || index} className="mb-1 text-gray-700">
            {block.numbered_list_item?.rich_text?.map((text: any, i: number) => text.plain_text).join('')}
          </li>
        );
      
      case 'code':
        return (
          <pre key={id || index} className="bg-gray-100 p-3 rounded-md overflow-x-auto mb-2">
            <code className="text-sm">
              {block.code?.rich_text?.map((text: any, i: number) => text.plain_text).join('')}
            </code>
          </pre>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Loading Notion content...</p>
        </div>
      </div>
    );
  }

  if (pages.length === 0 && databases.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Notion content found</h3>
          <p className="text-sm">Connect your Notion workspace to view your pages and databases here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Notion Content</h2>
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('pages')}
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                activeTab === 'pages'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Pages ({pages.length})
            </button>
            <button
              onClick={() => setActiveTab('databases')}
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                activeTab === 'databases'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Databases ({databases.length})
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-96">
        {/* Content List */}
        <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
          {activeTab === 'pages' ? (
            <div className="p-4">
              {pages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No pages found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      onClick={() => onPageSelect(page.id)}
                      className={`p-3 rounded-md cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedContent?.page?.id === page.id ? 'bg-blue-50 border border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {page.title}
                          </h3>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Calendar className="w-3 h-3 mr-1" />
                            <span>
                              {format(new Date(page.last_edited_time), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">
              {databases.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Database className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No databases found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {databases.map((database) => (
                    <div
                      key={database.id}
                      onClick={() => onDatabaseSelect(database.id)}
                      className={`p-3 rounded-md cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedContent?.databaseId === database.id ? 'bg-blue-50 border border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {database.title}
                          </h3>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Calendar className="w-3 h-3 mr-1" />
                            <span>
                              {format(new Date(database.last_edited_time), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content Viewer */}
        <div className="w-1/2 overflow-y-auto">
          {selectedContent ? (
            <div className="p-4">
              {selectedContent.page ? (
                <div>
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      {selectedContent.page.title}
                    </h2>
                    <div className="flex items-center text-sm text-gray-500 mb-4">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>
                        Last edited: {format(new Date(selectedContent.page.last_edited_time), 'MMM d, yyyy')}
                      </span>
                      <a
                        href={selectedContent.page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 inline-flex items-center text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Open in Notion
                      </a>
                    </div>
                  </div>
                  
                  <div className="prose prose-sm max-w-none">
                    {selectedContent.blocks?.map((block: any, index: number) => 
                      renderNotionBlock(block, index)
                    )}
                  </div>
                </div>
              ) : selectedContent.type === 'database' ? (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Database Entries</h2>
                  <div className="space-y-3">
                    {selectedContent.entries?.map((entry: any, index: number) => (
                      <div key={entry.id || index} className="border border-gray-200 rounded-md p-3">
                        <div className="text-sm text-gray-600">
                          {Object.entries(entry.properties).map(([key, value]: [string, any]) => (
                            <div key={key} className="mb-1">
                              <span className="font-medium">{key}:</span>{' '}
                              <span>
                                {value?.title?.[0]?.plain_text || 
                                 value?.rich_text?.[0]?.plain_text ||
                                 value?.select?.name ||
                                 value?.multi_select?.map((item: any) => item.name).join(', ') ||
                                 'N/A'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select content to view</h3>
              <p className="text-sm">Choose a page or database from the list to view its content</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
