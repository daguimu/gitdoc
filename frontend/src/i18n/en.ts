import type { LocaleKeys } from './zh';

const en: Record<LocaleKeys, string> = {
  // common
  'common.create': 'Create',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.restore': 'Restore',
  'common.download': 'Download',
  'common.save': 'Save',

  // relative dates
  'date.justNow': 'just now',
  'date.minutesAgo': '{0}m ago',
  'date.hoursAgo': '{0}h ago',
  'date.today': 'today',
  'date.yesterday': 'yesterday',
  'date.daysAgo': '{0}d ago',
  'date.monthsAgo': '{0}mo ago',
  'date.yearsAgo': '{0}y ago',

  // login
  'login.subtitle': 'Personal document management powered by GitHub',
  'login.button': 'Sign in with GitHub',
  'login.hint': 'Authorize via OAuth to access your GitHub repositories',
  'login.startFailed': 'Failed to start GitHub sign-in',

  // callback
  'callback.loading': 'Authorizing...',
  'callback.authError': 'GitHub authorization failed. Please try again.',
  'callback.invalidState': 'OAuth state validation failed. Please sign in again.',
  'callback.missingCode': 'Missing authorization code. Please sign in again.',

  // header
  'header.logout': 'Sign out',

  // repo selector
  'repo.fetchFailed': 'Failed to load repositories',
  'repo.createSuccess': 'Repository created',
  'repo.createFailed': 'Failed to create repository',
  'repo.searchPlaceholder': 'Find a repository...',
  'repo.new': 'New',
  'repo.filterAll': 'All',
  'repo.filterPublic': 'Public',
  'repo.filterPrivate': 'Private',
  'repo.favorites': 'Favorites',
  'repo.noMatch': 'No matching repositories found',
  'repo.createTitle': 'New repository',
  'repo.namePlaceholder': 'Repository name',
  'repo.privateRepo': 'Private',
  'repo.publicRepo': 'Public',
  'repo.updated': 'Updated {0}',
  'repo.private': 'Private',
  'repo.public': 'Public',

  // doc page
  'doc.backToList': 'Back to repositories',
  'doc.emptyHint': 'Select a file from the sidebar to start editing',
  'doc.emptySubHint': 'Rich text and Markdown editing supported',

  // file tree
  'tree.title': 'EXPLORER',
  'tree.fetchFailed': 'Failed to load file tree',
  'tree.uploading': 'Uploading...',
  'tree.uploadingFiles': 'Uploading {0} file(s)...',
  'tree.uploadSuccess': 'Uploaded ({0} files)',
  'tree.uploadFailed': 'Upload failed',
  'tree.createSuccess': 'Created successfully',
  'tree.createFailed': 'Failed to create',
  'tree.confirmDelete': 'Confirm delete',
  'tree.confirmDeleteMsg': 'Are you sure you want to delete {0}?',
  'tree.deleteSuccess': 'Deleted successfully',
  'tree.deleteFailed': 'Failed to delete',
  'tree.uploadFile': 'Upload file',
  'tree.uploadFileRoot': 'Upload file (root)',
  'tree.newFile': 'New file',
  'tree.newFolder': 'New folder',
  'tree.newSubFolder': 'New subfolder',
  'tree.trash': 'Trash',
  'tree.location': 'Location:',
  'tree.folderNamePlaceholder': 'Folder name',
  'tree.fileNamePlaceholder': 'File name (e.g. note.md)',

  // editor
  'editor.saveSuccess': 'Saved',
  'editor.saveFailed': 'Failed to save',
  'editor.placeholder': 'Start writing...',
  'editor.unsaved': 'Unsaved',
  'editor.richText': 'Rich text',
  'editor.markdown': 'Markdown',
  'editor.history': 'History',
  'editor.historyTooltip': 'Version history',

  // file preview
  'preview.image': 'Image',
  'preview.video': 'Video',
  'preview.audio': 'Audio',
  'preview.pdf': 'PDF',
  'preview.file': 'File',
  'preview.unsupported': 'This file type cannot be previewed',
  'preview.downloadFile': 'Download file',

  // file history
  'history.title': 'Version history',
  'history.fetchFailed': 'Failed to load history',
  'history.empty': 'No history available',
  'history.current': 'Current',
  'history.restored': 'Restored to this version',
  'history.restoreFailed': 'Failed to restore',
  'history.noDiff': 'No diff available (possibly initial creation)',

  // deleted files
  'deleted.title': 'Trash',
  'deleted.fetchFailed': 'Failed to load deleted files',
  'deleted.empty': 'No recently deleted files',
  'deleted.restored': 'Restored {0}',
  'deleted.restoreFailed': 'Failed to restore: {0}',
  'deleted.deletedBy': '{0} deleted {1}',
};

export default en;
