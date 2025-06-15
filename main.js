const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const Store = require('electron-store')
const store = new Store()
const { exec } = require('child_process')
const nodemailer = require('nodemailer')
const fs = require('fs')
const chokidar = require('chokidar')

// 파일 경로 설정
const mainPassPath = path.join(app.getPath('userData'), 'mainPass.json')
const emailPath = path.join(app.getPath('userData'), 'email.json')

// 이메일 설정
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'gonacon@gmail.com',
        pass: 'pcyw mfos dmpe lmbj'  // Gmail 앱 비밀번호
    }
});

// 이메일 전송 테스트
async function testEmailConnection() {
    try {
        await transporter.verify();
        console.log('이메일 서버 연결 성공');
    } catch (error) {
        console.error('이메일 서버 연결 실패:', error);
    }
}

// 앱 시작 시 이메일 연결 테스트
// testEmailConnection();

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        frame: false,
        fullscreen: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        movable: false,
        kiosk: true, // 이로 인해 Alt+Tab이나 Win키로 넘어가기가 아주 제한됩니다.
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            devTools: true
        }
    });

    win.setMenuBarVisibility(false);
    win.webContents.openDevTools(); // 개발자 도구 자동 실행

    win.loadFile('index.html');

    // 파일 변경 감지 및 자동 새로고침
    const watcher = chokidar.watch(['index.html', 'renderer.js'], {
        ignored: /(^|[\/\\])\../,
        persistent: true
    });

    watcher.on('change', (path) => {
        console.log(`File ${path} has been changed`);
        win.reload();
    });
}

app.whenReady().then(createWindow);

ipcMain.handle('is-mainPass-existing', () => {
    return store.get('mainPass') ? true : false
});

// 신규암호 저장
ipcMain.handle('set-mainPass', (event, pass) => {
    store.set('mainPass', pass);
});


// 암호 저장
ipcMain.handle('save-mainPass', async (event, password) => {
    try {
        console.log('암호 저장 시도');
        const store = new Store();
        store.set('mainPass', password);
        console.log('암호 저장 완료');
        return true;
    } catch (error) {
        console.error('암호 저장 오류:', error);
        return false;
    }
});

// 암호 확인
ipcMain.handle('validate-mainPass', (event, pass) => {
    return store.get('mainPass') === pass;
});

// 암호 초기화
ipcMain.handle('reset-mainPass', async () => {
    try {
        console.log('암호 초기화 시작');
        console.log('mainPassPath:', mainPassPath);
        console.log('emailPath:', emailPath);

        // 암호 파일 삭제
        if (fs.existsSync(mainPassPath)) {
            console.log('암호 파일 삭제 시도');
            fs.unlinkSync(mainPassPath);
            console.log('암호 파일 삭제 완료');
        }

        // 이메일 파일 삭제
        if (fs.existsSync(emailPath)) {
            console.log('이메일 파일 삭제 시도');
            fs.unlinkSync(emailPath);
            console.log('이메일 파일 삭제 완료');
        }

        console.log('암호 초기화 완료');
        return true;
    } catch (error) {
        console.error('암호 초기화 오류:', error);
        return false;
    }
});

// 프로그램 종료
ipcMain.handle('quit-app', () => {
    app.quit()
});

// 다른 프로그램 실행
ipcMain.handle('run-external-program', () => {
    // 여기에 실행할 프로그램의 경로를 지정하세요
    const programPath = 'C:\\Windows\\System32\\notepad.exe' // 예시로 메모장을 실행
    exec(programPath, (error) => {
        if (error) {
            console.error(`Error: ${error}`)
            return
        }
    })
});

// 일회용 비밀번호 생성
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// 이메일 전송
ipcMain.handle('send-otp', async (event, email) => {
    try {
        const otp = generateOTP();
        // OTP를 저장 (10분 유효)
        store.set('otp', {
            code: otp,
            email: email,
            timestamp: Date.now()
        });

        const mailOptions = {
            from: {
                name: 'GateKey',  // 발신자 이름을 GateKey로 표시
                address: 'nacon.yo@gmail.com'  // 실제 Gmail 주소
            },
            to: email,
            subject: 'GateKey일회용 비밀번호',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">일회용 비밀번호</h2>
                    <p style="color: #666;">귀하의 일회용 비밀번호는 다음과 같습니다:</p>
                    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #333; margin: 0; font-size: 32px;">${otp}</h1>
                    </div>
                    <p style="color: #666;">이 비밀번호는 10분간 유효합니다.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('이메일 전송 성공:', email);
        return true;
    } catch (error) {
        console.error('이메일 전송 실패:', error);
        return false;
    }
});

// OTP 확인
ipcMain.handle('verify-otp', (event, otp) => {
    const storedOTP = store.get('otp');
    if (!storedOTP) return false;

    // 10분 유효 시간 체크
    const isExpired = Date.now() - storedOTP.timestamp > 10 * 60 * 1000;
    if (isExpired) {
        store.delete('otp');
        return false;
    }

    return storedOTP.code === otp;
});

// 이메일 설정 저장
ipcMain.handle('save-email', (event, email) => {
    store.set('email', email);
    return true;
});

// 이메일 설정 확인
ipcMain.handle('has-email', () => {
    return store.has('email');
});

// 이메일 주소 가져오기
ipcMain.handle('get-email', () => {
    return store.get('email');
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

// Mac에서 dock icon 클릭시 다시 열린도록
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
});
