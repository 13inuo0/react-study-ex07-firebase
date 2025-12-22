import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";

export function Todo() {
  const [user, setUser] = useState(null);
  //   페이지가 처음 열릴 때 로그인 상태를 확인하기
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    // return : 나중에 이 감시를 그만둘 때 사용(페이지를 떠나면 감시를 중단하기.)
    return () => unsubscribeAuth();
  }, []); //[]빈 배열: 페이지가 처음 열릴 때만 실행하기.
  return (
    <>
      <div
        style={{
          // style: 화면에 보이는 모양을 정하는 것
          textAlign: "center", // 글자를 가운데 정렬
          marginTop: "50px", // 위에서 50px 떨어뜨리기
          maxWidth: "400px", // 최대 너비 400px
          marginLeft: "auto", // 왼쪽 여백 자동
          marginRight: "auto", // 오른쪽 여백 자동 (가운데 정렬)
        }}>
        {/* 헤더 부분: 제목과 사용자 정보, 로그아웃 버튼 */}
        <div
          style={{
            display: "flex", // 가로로 나란히 배치
            justifyContent: "space-between", // 양쪽 끝에 배치 (제목은 왼쪽, 버튼은 오른쪽)
            alignItems: "center", // 세로로 가운데 정렬
            marginBottom: "20px", // 아래쪽 여백
          }}>
          <h1>할일 관리</h1>
          <div>
            {/* 사용자 이름 또는 이메일 표시 */}
            <span style={{ marginRight: "10px" }}>{user.displayName || user.email}</span>
            {/* 로그아웃 버튼 */}
            <button
              style={{
                padding: "5px 10px", // 안쪽 여백
                fontSize: "14px", // 글자 크기
                backgroundColor: "#dc3545", // 배경색 (빨간색)
                color: "white", // 글자색 (흰색)
                border: "none", // 테두리 없음
                borderRadius: "5px", // 모서리를 둥글게
                cursor: "pointer", // 마우스를 올리면 손가락 모양으로 바뀜
              }}>
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
