import React, { useState, useCallback } from 'react';
import { Typography, Space } from 'antd';
import { InboxOutlined, VideoCameraOutlined, FileTextOutlined, PictureOutlined } from '@ant-design/icons';
import type { MediaFile, MediaType } from '../types';

interface DragZoneProps {
  onFileSelected: (file: MediaFile) => void;
}

function detectMediaType(fileName: string): MediaType {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v'];
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
  const articleExts = ['txt', 'md', 'doc', 'docx', 'html'];

  if (videoExts.includes(ext)) return 'video';
  if (imageExts.includes(ext)) return 'image';
  if (articleExts.includes(ext)) return 'article';
  return 'unknown';
}

const mediaTypeIcons: Record<MediaType, React.ReactNode> = {
  video: <VideoCameraOutlined style={{ fontSize: 48, color: '#1890ff' }} />,
  image: <PictureOutlined style={{ fontSize: 48, color: '#52c41a' }} />,
  article: <FileTextOutlined style={{ fontSize: 48, color: '#fa8c16' }} />,
  unknown: <InboxOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />,
};

const mediaTypeLabels: Record<MediaType, string> = {
  video: '视频',
  image: '图片',
  article: '文章',
  unknown: '未知',
};

// Electron exposes the native file path on File objects via a non-standard 'path' property
interface ElectronFile extends File {
  path?: string;
}

export const DragZone: React.FC<DragZoneProps> = ({ onFileSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);

  const handleFile = useCallback((file: File) => {
    const mediaType = detectMediaType(file.name);
    const mediaFile: MediaFile = {
      path: (file as ElectronFile).path || file.name,
      name: file.name,
      size: file.size,
      type: mediaType,
    };
    setSelectedFile(mediaFile);
    onFileSelected(mediaFile);
  }, [onFileSelected]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*,image/*,.txt,.md,.doc,.docx';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  };

  return (
    <div
      className={`drag-zone ${isDragging ? 'dragging' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      {selectedFile ? (
        <Space direction="vertical" align="center">
          {mediaTypeIcons[selectedFile.type]}
          <Typography.Text strong>{selectedFile.name}</Typography.Text>
          <Typography.Text type="secondary">
            类型: {mediaTypeLabels[selectedFile.type]} | 大小: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            点击或拖拽重新选择文件
          </Typography.Text>
        </Space>
      ) : (
        <Space direction="vertical" align="center">
          <InboxOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
          <Typography.Text>点击或拖拽文件到此区域上传</Typography.Text>
          <Typography.Text type="secondary">
            支持视频（MP4、AVI、MOV等）、图片（JPG、PNG等）、文章（TXT、MD、DOC等）
          </Typography.Text>
        </Space>
      )}
    </div>
  );
};
