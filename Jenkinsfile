pipeline {
    agent any

    environment {
        // TODO: Replace with your deployment server IP
        DEPLOY_HOST = 'YOUR_SERVER_IP'
        DEPLOY_DIR  = '/opt/gitdoc'
        HEALTH_URL  = 'https://YOUR_DOMAIN/health'
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

                    // TODO: Replace with your Jenkins SSH credential ID
                    withCredentials([sshUserPrivateKey(credentialsId: 'YOUR_SSH_CREDENTIAL_ID', keyFileVariable: 'identity', passphraseVariable: '', usernameVariable: 'userName')]) {
                        remote.user = userName ?: 'root'
                        remote.identityFile = identity

                        sshCommand remote: remote, command: "mkdir -p ${env.DEPLOY_DIR}"
                        sshPut remote: remote, from: '/tmp/gitdoc.tar.gz', into: '/tmp/'

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
                    sh "curl -sf ${env.HEALTH_URL}"
                }
            }
        }
    }

    post {
        success {
            echo 'GitDoc deployed successfully.'
        }
        failure {
            echo 'Deploy failed. Check console output above for details.'
        }
        always {
            sh 'rm -f /tmp/gitdoc.tar.gz'
        }
    }
}
