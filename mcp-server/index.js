import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000/api';
const TOKEN = process.env.API_TOKEN;

if (!TOKEN) {
  console.error('  API_TOKEN is required in .env');
  process.exit(1);
}

const api = axios.create({
  baseURL: API_BASE,
  headers: { Authorization: `Bearer ${TOKEN}` },
});

const TOOLS = [
  {
    name: 'list_folders',
    description: 'List all folders. Pass a parentId to list subfolders inside a folder, or omit it for root-level folders.',
    inputSchema: {
      type: 'object',
      properties: {
        parentId: {
          type: 'string',
          description: 'Optional: ID of parent folder to list subfolders of. Omit for root.',
        },
      },
    },
  },
  {
    name: 'create_folder',
    description: 'Create a new folder. Optionally nest it inside a parent folder by providing parentId.',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: {
          type: 'string',
          description: 'Name of the folder to create.',
        },
        parentId: {
          type: 'string',
          description: 'Optional: ID of the parent folder. Omit to create at root level.',
        },
      },
    },
  },
  {
    name: 'get_folder',
    description: 'Get details of a specific folder including its total size.',
    inputSchema: {
      type: 'object',
      required: ['folderId'],
      properties: {
        folderId: {
          type: 'string',
          description: 'ID of the folder to retrieve.',
        },
      },
    },
  },
  {
    name: 'delete_folder',
    description: 'Delete a folder and ALL its contents (subfolders and images) permanently.',
    inputSchema: {
      type: 'object',
      required: ['folderId'],
      properties: {
        folderId: {
          type: 'string',
          description: 'ID of the folder to delete.',
        },
      },
    },
  },
  {
    name: 'list_images',
    description: 'List all images inside a specific folder.',
    inputSchema: {
      type: 'object',
      required: ['folderId'],
      properties: {
        folderId: {
          type: 'string',
          description: 'ID of the folder whose images to list.',
        },
      },
    },
  },
  {
    name: 'upload_image',
    description: 'Upload a local image file into a folder.',
    inputSchema: {
      type: 'object',
      required: ['name', 'filePath', 'folderId'],
      properties: {
        name: {
          type: 'string',
          description: 'Display name for the image.',
        },
        filePath: {
          type: 'string',
          description: 'Absolute path to the local image file to upload.',
        },
        folderId: {
          type: 'string',
          description: 'ID of the folder to upload the image into.',
        },
      },
    },
  },
  {
    name: 'delete_image',
    description: 'Permanently delete an image by its ID.',
    inputSchema: {
      type: 'object',
      required: ['imageId'],
      properties: {
        imageId: {
          type: 'string',
          description: 'ID of the image to delete.',
        },
      },
    },
  },
  {
    name: 'get_me',
    description: 'Get the currently authenticated user\'s profile information.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];


const handlers = {
  list_folders: async ({ parentId }) => {
    const params = parentId ? { parent: parentId } : {};
    const { data } = await api.get('/folders', { params });
    const folders = data.folders || [];
    if (folders.length === 0) return 'No folders found.';
    const lines = folders.map(f =>
      `• ${f.name} (id: ${f._id}) — Size: ${formatBytes(f.totalSize)} — Created: ${new Date(f.createdAt).toLocaleDateString()}`
    );
    return `Found ${folders.length} folder(s):\n${lines.join('\n')}`;
  },

  create_folder: async ({ name, parentId }) => {
    const { data } = await api.post('/folders', { name, parent: parentId || null });
    const f = data.folder;
    return ` Folder "${f.name}" created successfully.\nID: ${f._id}\nParent: ${f.parent || 'root'}`;
  },

  get_folder: async ({ folderId }) => {
    const { data } = await api.get(`/folders/${folderId}`);
    const f = data.folder;
    const path = f.ancestors?.map(a => a.name).join(' / ') || 'root';
    return `Folder: ${f.name}\nID: ${f._id}\nPath: ${path} / ${f.name}\nTotal Size: ${formatBytes(f.totalSize)}\nCreated: ${new Date(f.createdAt).toLocaleString()}`;
  },

  delete_folder: async ({ folderId }) => {
    await api.delete(`/folders/${folderId}`);
    return ` Folder (id: ${folderId}) and all its contents deleted permanently.`;
  },

  list_images: async ({ folderId }) => {
    const { data } = await api.get('/images', { params: { folder: folderId } });
    const images = data.images || [];
    if (images.length === 0) return 'No images in this folder.';
    const lines = images.map(img =>
      `• ${img.name} (id: ${img._id}) — ${formatBytes(img.size)} — ${img.originalName} — ${new Date(img.createdAt).toLocaleDateString()}`
    );
    return `Found ${images.length} image(s):\n${lines.join('\n')}`;
  },

  upload_image: async ({ name, filePath, folderId }) => {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const form = new FormData();
    form.append('name', name);
    form.append('folder', folderId);
    form.append('image', fs.createReadStream(filePath), {
      filename: path.basename(filePath),
    });
    const { data } = await api.post('/images', form, {
      headers: form.getHeaders(),
    });
    const img = data.image;
    return ` Image "${img.name}" uploaded successfully.\nID: ${img._id}\nSize: ${formatBytes(img.size)}\nURL: ${img.url}`;
  },

  delete_image: async ({ imageId }) => {
    await api.delete(`/images/${imageId}`);
    return ` Image (id: ${imageId}) deleted successfully.`;
  },

  get_me: async () => {
    const { data } = await api.get('/auth/me');
    const u = data.user;
    return `Authenticated as:\nName: ${u.name}\nEmail: ${u.email}\nID: ${u.id}`;
  },
};

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const server = new Server(
  { name: 'dobby-ads-drive', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const handler = handlers[name];
  if (!handler) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  try {
    const result = await handler(args || {});
    return { content: [{ type: 'text', text: result }] };
  } catch (err) {
    const message = err.response?.data?.message || err.message || 'Unknown error';
    return {
      content: [{ type: 'text', text: ` Error: ${message}` }],
      isError: true,
    };
  }
});

// Start server over stdio (for Claude Desktop)
const transport = new StdioServerTransport();
await server.connect(transport);
console.error(' Dobby Ads MCP server running (stdio)');
