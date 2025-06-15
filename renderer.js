const { ipcRenderer } = require('electron')

console.log('renderer.js 시작');

// UI 요소들
const setPass = document.getElementById('setPass')
const emailSetup = document.getElementById('emailSetup')
const login = document.getElementById('login')
const changePass = document.getElementById('changePass')
const otpSection = document.getElementById('otpSection')

console.log('UI 요소들:', { setPass, emailSetup, login, changePass, otpSection });

// 초기 화면 설정
ipcRenderer.invoke('is-mainPass-existing').then((exists) => {
    if (exists) {
        setPass.classList.add('hidden');
        login.classList.remove('hidden');
    } else {
        setPass.classList.remove('hidden');
        login.classList.add('hidden');
    }
});

// 신규 암호 저장
document.getElementById('setPassBtn').addEventListener('click', async () => {
    const p1 = document.getElementById('newPass1').value.trim();
    const p2 = document.getElementById('newPass2').value.trim();

    if (p1.length < 4) {
        alert("암호는 4자 이상!");
        return;
    }
    if (p1 !== p2) {
        alert("암호가 일치하지 않아요.");
        return;
    }

    await ipcRenderer.invoke('set-mainPass', p1);
    alert("암호가 설정되었습니다!");
    setPass.classList.add('hidden');

    // 이메일 설정 여부 확인
    const hasEmail = await ipcRenderer.invoke('has-email');
    if (hasEmail) {
        // 이메일이 이미 설정되어 있으면 로그인 화면으로 이동
        login.classList.remove('hidden');
    } else {
        // 이메일이 설정되어 있지 않으면 이메일 설정 화면으로 이동
        emailSetup.classList.remove('hidden');
    }
});

// 이메일 설정 화면으로 이동
document.getElementById('emailSetupBtn').addEventListener('click', async () => {
    const input = document.getElementById('inputPass').value.trim();
    const isValid = await ipcRenderer.invoke('validate-mainPass', input);

    if (isValid) {
        // 현재 설정된 이메일 주소 가져오기
        const currentEmail = await ipcRenderer.invoke('get-email');
        if (currentEmail) {
            document.getElementById('email').value = currentEmail;
            document.getElementById('currentEmailText').textContent = `현재 설정된 이메일: ${currentEmail}`;
            document.getElementById('currentEmailText').style.display = 'block';
        } else {
            document.getElementById('currentEmailText').style.display = 'none';
        }

        login.classList.add('hidden');
        emailSetup.classList.remove('hidden');
        // 입력 필드 초기화
        document.getElementById('inputPass').value = '';
    } else {
        alert("암호가 틀렸습니다!");
    }
});

// 이메일 저장
document.getElementById('saveEmailBtn').addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    console.log('saveEmailBtn clicked', email);
    if (!email) {
        alert('이메일 주소를 입력해주세요.');
        return;
    }
    await ipcRenderer.invoke('save-email', email);
    alert('이메일이 저장되었습니다.');
    emailSetup.classList.add('hidden');
    login.classList.remove('hidden');
});

// 이메일 설정 건너뛰기
document.getElementById('skipEmailBtn').addEventListener('click', () => {
    emailSetup.classList.add('hidden');
    login.classList.remove('hidden');
    // 입력 필드 초기화
    document.getElementById('email').value = '';
});

// 암호 확인
document.getElementById('loginBtn').addEventListener('click', async () => {
    const input = document.getElementById('inputPass').value.trim();
    const isValid = await ipcRenderer.invoke('validate-mainPass', input);

    if (isValid) {
        await ipcRenderer.invoke('quit-app');
    } else {
        console.log('암호가 틀렸습니다!');

        alert("암호가 틀렸습니다!");
    }
});

// 일회용 키 전송
document.getElementById('sendOtpBtn').addEventListener('click', async () => {
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const loadingSpinner = document.getElementById('otpLoadingSpinner');

    try {
        // 버튼 비활성화 및 로딩 스피너 표시
        sendOtpBtn.disabled = true;
        loadingSpinner.style.display = 'inline-block';
        sendOtpBtn.textContent = '전송 중...';

        // 저장된 이메일 주소 가져오기
        const email = await ipcRenderer.invoke('get-email');
        if (!email) {
            alert('이메일이 설정되어 있지 않습니다. 이메일 설정을 먼저 해주세요.');
            return;
        }

        const success = await ipcRenderer.invoke('send-otp', email);
        if (success) {
            alert('일회용 키가 이메일로 전송되었습니다.');
            document.getElementById('otpInputGroup').style.display = 'flex';
            document.getElementById('verifyOtpBtn').style.display = 'block';
        } else {
            alert('이메일 전송에 실패했습니다. 다시 시도해주세요.');
        }
    } catch (error) {
        alert('오류가 발생했습니다. 다시 시도해주세요.');
        console.error('OTP 전송 오류:', error);
    } finally {
        // 버튼 활성화 및 로딩 스피너 숨김
        sendOtpBtn.disabled = false;
        loadingSpinner.style.display = 'none';
        sendOtpBtn.textContent = '일회용 키 전송';
    }
});

// 일회용 키 확인
document.getElementById('verifyOtpBtn').addEventListener('click', async () => {
    const otp = document.getElementById('otpInput').value.trim();
    if (!otp) {
        alert('일회용 키를 입력해주세요.');
        return;
    }

    const isValid = await ipcRenderer.invoke('verify-otp', otp);
    if (isValid) {
        alert('일회용 키가 확인되었습니다.');
        await ipcRenderer.invoke('quit-app');
    } else {
        alert('일회용 키가 유효하지 않거나 만료되었습니다.');
    }
});

// OTP 재전송
// document.getElementById('resendOtpBtn').addEventListener('click', async () => {
//     const email = await ipcRenderer.invoke('get-email');
//     const success = await ipcRenderer.invoke('send-otp', email);
//     if (success) {
//         alert('일회용 비밀번호가 재전송되었습니다.');
//     } else {
//         alert('이메일 전송에 실패했습니다.');
//     }
// });

// 암호 변경
passChangeBtn.addEventListener('click', async () => {
    console.log('암호 변경 버튼 클릭됨');

    const input = document.getElementById('inputPass').value.trim();
    console.log('입력된 암호:', input);

    if (!input) {
        alert('현재 암호를 입력해주세요.');
        return;
    }

    try {
        const isValid = await ipcRenderer.invoke('validate-mainPass', input);
        console.log('암호 검증 결과:', isValid);

        if (isValid) {
            console.log('암호 검증 성공, 화면 전환');
            login.classList.add('hidden');
            changePass.classList.remove('hidden');
            // 입력 필드 초기화
            document.getElementById('inputPass').value = '';
            document.getElementById('currentPass').value = '';
            document.getElementById('newPass').value = '';
            document.getElementById('confirmNewPass').value = '';
        } else {
            console.log('암호 검증 실패');
            alert("암호가 틀렸습니다!");
        }
    } catch (error) {
        console.error('암호 변경 중 오류 발생:', error);
        alert("오류가 발생했습니다. 다시 시도해주세요.");
    }
});
console.log('암호 변경 버튼 이벤트 리스너 등록 완료');

// 암호 변경 취소
document.getElementById('cancelChangeBtn').addEventListener('click', () => {
    changePass.classList.add('hidden');
    login.classList.remove('hidden');
    // 입력 필드 초기화
    document.getElementById('currentPass').value = '';
    document.getElementById('newPass').value = '';
    document.getElementById('confirmNewPass').value = '';
});

// 암호 변경 저장
document.getElementById('confirmChangeBtn').addEventListener('click', async () => {
    console.log('암호 변경 저장 버튼 클릭됨');
    const currentPass = document.getElementById('currentPass').value.trim();
    const newPass = document.getElementById('newPass').value.trim();
    const confirmNewPass = document.getElementById('confirmNewPass').value.trim();

    if (!currentPass || !newPass || !confirmNewPass) {
        alert('모든 필드를 입력해주세요.');
        return;
    }

    if (newPass !== confirmNewPass) {
        alert('새 암호가 일치하지 않습니다.');
        return;
    }

    try {
        console.log('현재 암호 검증 시작');
        const isValid = await ipcRenderer.invoke('validate-mainPass', currentPass);
        console.log('현재 암호 검증 결과:', isValid);

        if (!isValid) {
            alert('현재 암호가 틀렸습니다.');
            return;
        }

        console.log('새 암호 저장 시작');
        const success = await ipcRenderer.invoke('save-mainPass', newPass);
        console.log('새 암호 저장 결과:', success);

        if (success) {
            alert('암호가 변경되었습니다.');
            changePass.classList.add('hidden');
            login.classList.remove('hidden');
            // 입력 필드 초기화
            document.getElementById('currentPass').value = '';
            document.getElementById('newPass').value = '';
            document.getElementById('confirmNewPass').value = '';
        } else {
            alert('암호 변경에 실패했습니다.');
        }
    } catch (error) {
        console.error('암호 변경 중 오류 발생:', error);
        alert('암호 변경 중 오류가 발생했습니다.');
    }
});

// 암호 초기화
document.getElementById('resetPassBtn').addEventListener('click', async () => {
    console.log('암호 초기화 버튼 클릭됨');
    if (confirm('저장된 암호를 초기화하시겠습니까?')) {
        try {
            console.log('암호 초기화 요청');
            const success = await ipcRenderer.invoke('reset-mainPass');
            console.log('암호 초기화 결과:', success);

            if (success) {
                alert('암호가 초기화되었습니다.');
                // 모든 화면 숨기기
                login.classList.add('hidden');
                emailSetup.classList.add('hidden');
                changePass.classList.add('hidden');
                // otpSection.classList.add('hidden');
                // 암호 설정 화면 표시
                setPass.classList.remove('hidden');
                // 모든 입력 필드 초기화
                document.getElementById('inputPass').value = '';
                document.getElementById('email').value = '';
                document.getElementById('currentEmailText').style.display = 'none';
                document.getElementById('otpInput').value = '';
                document.getElementById('otpInputGroup').style.display = 'none';
                document.getElementById('verifyOtpBtn').style.display = 'none';
                console.log('UI 초기화 완료');
            } else {
                alert('암호 초기화에 실패했습니다.');
            }
        } catch (error) {
            console.error('암호 초기화 중 오류 발생:', error);
            alert('암호 초기화 중 오류가 발생했습니다.');
        }
    }
});
