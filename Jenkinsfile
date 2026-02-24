pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Deploy') {
            steps {
                script {
                    def deployHost = (params.DEPLOY_HOST ?: env.DEPLOY_HOST ?: '').trim()
                    def deployDir = (params.DEPLOY_DIR ?: env.DEPLOY_DIR ?: '/opt/gitdoc').trim()
                    def deployCredentialId = (params.DEPLOY_SSH_CREDENTIAL_ID ?: env.DEPLOY_SSH_CREDENTIAL_ID ?: '').trim()

                    if (!deployHost) {
                        error("Missing DEPLOY_HOST. Configure it as a Jenkins job parameter or environment variable.")
                    }
                    if (!deployCredentialId) {
                        error("Missing DEPLOY_SSH_CREDENTIAL_ID. Configure it as a Jenkins job parameter or environment variable.")
                    }

                    sh "tar czf /tmp/gitdoc.tar.gz --exclude='.git' --exclude='node_modules' --exclude='dist' --exclude='deploy/.env' ."

                    def remote = [:]
                    remote.name = 'deployment-server'
                    remote.host = deployHost
                    remote.user = 'root'
                    remote.port = 22
                    remote.allowAnyHosts = true

                    withCredentials([sshUserPrivateKey(credentialsId: deployCredentialId, keyFileVariable: 'identity', passphraseVariable: '', usernameVariable: 'userName')]) {
                        remote.user = userName ?: 'root'
                        remote.identityFile = identity

                        sshCommand remote: remote, command: "mkdir -p ${deployDir}"
                        sshPut remote: remote, from: '/tmp/gitdoc.tar.gz', into: '/tmp/'

                        sshCommand remote: remote, command: """
                            cd ${deployDir}
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
                script {
                    def healthUrl = (params.HEALTH_URL ?: env.HEALTH_URL ?: '').trim()
                    if (!healthUrl) {
                        error("Missing HEALTH_URL. Configure it as a Jenkins job parameter or environment variable.")
                    }
                }
                retry(3) {
                    sleep 5
                    sh "curl -sf ${(params.HEALTH_URL ?: env.HEALTH_URL).trim()}"
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
