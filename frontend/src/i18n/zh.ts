const zh = {
  // common
  'common.create': '创建',
  'common.cancel': '取消',
  'common.delete': '删除',
  'common.restore': '恢复',
  'common.download': '下载',
  'common.save': '保存',

  // relative dates
  'date.justNow': '刚刚',
  'date.minutesAgo': '{0} 分钟前',
  'date.hoursAgo': '{0} 小时前',
  'date.today': '今天',
  'date.yesterday': '昨天',
  'date.daysAgo': '{0} 天前',
  'date.monthsAgo': '{0} 个月前',
  'date.yearsAgo': '{0} 年前',

  // login
  'login.subtitle': '基于 GitHub 的个人文档管理系统',
  'login.button': '使用 GitHub 登录',
  'login.hint': '登录后将通过 OAuth 授权访问你的 GitHub 仓库',
  'login.startFailed': '发起 GitHub 登录失败',

  // callback
  'callback.loading': '正在授权...',
  'callback.authError': 'GitHub 授权失败，请重试',
  'callback.invalidState': '授权状态校验失败，请重新登录',
  'callback.missingCode': '未收到授权码，请重新登录',

  // header
  'header.logout': '退出登录',

  // repo selector
  'repo.fetchFailed': '获取仓库列表失败',
  'repo.createSuccess': '仓库创建成功',
  'repo.createFailed': '创建仓库失败',
  'repo.searchPlaceholder': '搜索仓库...',
  'repo.new': '新建',
  'repo.filterAll': '全部',
  'repo.filterPublic': '公开',
  'repo.filterPrivate': '私有',
  'repo.favorites': '我的关注',
  'repo.noMatch': '没有找到匹配的仓库',
  'repo.createTitle': '新建仓库',
  'repo.namePlaceholder': '仓库名称',
  'repo.privateRepo': '私有仓库',
  'repo.publicRepo': '公开仓库',
  'repo.updated': '更新于 {0}',
  'repo.private': '私有',
  'repo.public': '公开',

  // doc page
  'doc.backToList': '返回仓库列表',
  'doc.emptyHint': '从左侧选择一个文件开始编辑',
  'doc.emptySubHint': '支持富文本和 Markdown 编辑模式',

  // file tree
  'tree.title': '文件资源管理器',
  'tree.fetchFailed': '获取文件树失败',
  'tree.uploading': '上传中...',
  'tree.uploadingFiles': '正在上传 {0} 个文件...',
  'tree.uploadSuccess': '上传成功 ({0} 个文件)',
  'tree.uploadFailed': '上传失败',
  'tree.createSuccess': '创建成功',
  'tree.createFailed': '创建失败',
  'tree.confirmDelete': '确认删除',
  'tree.confirmDeleteMsg': '确定要删除 {0} 吗？',
  'tree.deleteSuccess': '删除成功',
  'tree.deleteFailed': '删除失败',
  'tree.uploadFile': '上传文件',
  'tree.uploadFileRoot': '上传文件（根目录）',
  'tree.newFile': '新建文件',
  'tree.newFolder': '新建文件夹',
  'tree.newSubFolder': '新建子文件夹',
  'tree.trash': '回收站',
  'tree.location': '位置:',
  'tree.folderNamePlaceholder': '文件夹名称',
  'tree.fileNamePlaceholder': '文件名称 (例如: note.md)',

  // editor
  'editor.saveSuccess': '保存成功',
  'editor.saveFailed': '保存失败',
  'editor.placeholder': '开始编辑...',
  'editor.unsaved': '未保存',
  'editor.richText': '富文本',
  'editor.markdown': 'Markdown',
  'editor.history': '历史',
  'editor.historyTooltip': '历史版本',

  // file preview
  'preview.image': '图片',
  'preview.video': '视频',
  'preview.audio': '音频',
  'preview.pdf': 'PDF',
  'preview.file': '文件',
  'preview.unsupported': '该文件类型不支持预览',
  'preview.downloadFile': '下载文件',

  // file history
  'history.title': '历史版本',
  'history.fetchFailed': '获取历史版本失败',
  'history.empty': '暂无历史记录',
  'history.current': '当前版本',
  'history.restored': '已恢复到该版本',
  'history.restoreFailed': '恢复失败',
  'history.noDiff': '无差异内容（可能是初次创建）',

  // deleted files
  'deleted.title': '回收站',
  'deleted.fetchFailed': '获取删除记录失败',
  'deleted.empty': '没有最近删除的文件',
  'deleted.restored': '已恢复 {0}',
  'deleted.restoreFailed': '恢复失败: {0}',
  'deleted.deletedBy': '{0} 删除于 {1}',
} as const;

export type LocaleKeys = keyof typeof zh;
export default zh;
