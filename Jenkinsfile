pipeline {
    agent any

    environment {
        DEPLOY_HOST = '8.140.158.233'
        DEPLOY_DIR  = '/opt/gitdoc'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Deploy') {
            steps {
                script {
                    sh "tar czf /tmp/gitdoc.tar.gz --exclude='.git' --exclude='node_modules' --exclude='dist' --exclude='deploy/.env' ."

                    def remote = [:]
                    remote.name = 'deployment-server'
                    remote.host = env.DEPLOY_HOST
                    remote.user = 'root'
                    remote.port = 22
                    remote.allowAnyHosts = true

                    withCredentials([sshUserPrivateKey(credentialsId: 'c60bb0d8-7cd0-48d4-9d43-5a46f5d26318', keyFileVariable: 'identity', passphraseVariable: '', usernameVariable: 'userName')]) {
                        remote.user = userName ?: 'root'
                        remote.identityFile = identity

                        // 创建目录并上传代码包
                        sshCommand remote: remote, command: "mkdir -p ${env.DEPLOY_DIR}"
                        sshPut remote: remote, from: '/tmp/gitdoc.tar.gz', into: '/tmp/'

                        // 解压并部署
                        sshCommand remote: remote, command: """
                            cd ${env.DEPLOY_DIR}
                            tar xzf /tmp/gitdoc.tar.gz
                            rm -f /tmp/gitdoc.tar.gz
                            cd deploy
                            docker compose up --build -d
                        """
                    }
                }
            }
        }

        stage('Health Check') {
            steps {
                retry(3) {
                    sleep 5
                    sh 'curl -sf https://gitdoc.dagm.com/health'
                }
            }
        }
    }

    post {
        success {
            echo 'GitDoc deployed successfully at https://gitdoc.dagm.com'
        }
        failure {
            echo 'Deploy failed. Check console output above for details.'
        }
        always {
            sh 'rm -f /tmp/gitdoc.tar.gz'
        }
    }
}
