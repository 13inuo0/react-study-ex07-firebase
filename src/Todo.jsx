import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth, db, googleProvider } from "./firebase";
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, Timestamp, updateDoc, where } from "firebase/firestore";

export function Todo() {
  const [user, setUser] = useState(null);
  const [task, setTask] = useState("");
  const [taskList, setTaskLIst] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");

  //   페이지가 처음 열릴 때 로그인 상태를 확인하기
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    // return : 나중에 이 감시를 그만둘 때 사용(페이지를 떠나면 감시를 중단하기.)
    return () => unsubscribeAuth();
  }, []); //[]빈 배열: 페이지가 처음 열릴 때만 실행하기.

  //   구글 로그인이 되지 않았을 때. (만약 아무도 로그인하지 않았다면 로그인화면 보여주기)

  // 로그인 한 사람의 할 일 목록을 데이터 베이스에서 가져오기
  useEffect(() => {
    // 만약에 로그인 하지 않았다면
    if (!user) {
      setTaskLIst([]);
      return; // 더이상 할 일 없음. 여기서 끝내기.
    }
    const q = query(collection(db, "todos"), where("userId", "==", user.uid));
    // onSnapshot()는 데이터가 바뀔 떄 마다 자동으로 여러부분 실시간 감시자
    const unsubscribe = onSnapshot(
      q, //위에서 만든 질문(나의 할일만 찾기)
      (snapshot) => {
        console.log(snapshot);
        const tasks = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(), //할 일 내용들
          date: doc.data().createAt?.toDate().toLocsleString() || "", //만든 날짜를 보기좋게 바꾸기
          createdAtTimestmp: doc.data().createdAt, // 나중에 정렬하기 위해 시간 정보 보관 정렬 / 비교용
        }));
        console.log(tasks);
        tasks.sort((a, b) => {
          if (!a.createdAtTimestmp || !b.createdAtTimestmp) return 0;
          return b.createdAtTimestmp.toMillis() - a.createdAtTimestmp.toMillis(); //시간을 숫자로 바꾸는 것.
        });
        setTaskLIst(tasks);
      }
    );
    return () => unsubscribe();
  }, [user]); //user가 바뀔 때 마다 실행(로그인 / 로그아웃할 때)

  //   구글 로그인 클릭 시
  function handleGoogleLogin() {
    // 구글로그인 창을 띄워 로그인하기
    signInWithPopup(auth, googleProvider)
      .then((result) => {
        setUser(result.user);
        console.log(result);
      })
      .catch((error) => {
        alert("로그인 실패: " + error.message + "\n\nFirebase 설정 정보를 확인해주세요!");
      });
  }
  //   로그아웃 버튼 클릭시
  function handleLogout() {
    signOut(auth)
      .then(() => {
        setUser(null);
      })
      .catch((error) => {
        // 로그아웃이 실패하면 실행되는 부분
        console.log("로그아웃 실패:", error); // 콘솔에 실패 메시지 출력
      });
  }
  // 할일 추가 버튼
  async function handleAdd() {
    if ((task.trim() === "") | !user) return;
    try {
      await addDoc(collection(db, "todos"), {
        userId: user.uid,
        text: task, //할일 내용
        done: false,
        createdAt: Timestamp.now(), //지금 시간을 기록하기.
      });
      setTask("");
    } catch (error) {
      // catch: 문제가 생겼을 때 실행되는 부분
      console.error("할 일 추가 실패:", error); // 콘솔에 에러 출력
      alert("할 일 추가에 실패했습니다: " + error.message); // 사용자에게 에러 메시지 보여주기
    }
  }

  async function toggleDone(id) {
    const task = taskList.find((t) => t.id === id);
    if (!task) return; // 만약에 찾지 못하면 여기서 끝내기
    try {
      const taskRef = doc(db, "todos", id);
      await updateDoc(taskRef, {
        done: !task.done, //토글기능
      });
    } catch (error) {
      // catch: 문제가 생겼을 때 실행되는 부분
      console.error("완료 상태 변경 실패:", error); // 콘솔에 에러 출력
      alert("완료 상태 변경에 실패했습니다: " + error.message); // 사용자에게 에러 메시지 보여주기
    }
  }
  async function handleEditSave(id) {
    if (editText.trim() === "") return;
    try {
      const taskRef = doc(db, "todos", id);
      await updateDoc(taskRef, {
        text: editText,
      });
      setEditId(null);
      setEditText("");
    } catch (error) {
      // catch: 문제가 생겼을 때 실행되는 부분
      console.error("수정 실패:", error); // 콘솔에 에러 출력
      alert("수정에 실패했습니다: " + error.message); // 사용자에게 에러 메시지 보여주기
    }
  }
  function handleEditStart(id, currentText) {
    setEditId(id);
    setEditText(currentText);
  }
  async function handleDelete(id) {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      const taskRef = doc(db, "todos", id);
      await deleteDoc(taskRef);
    } catch (error) {
      // catch: 문제가 생겼을 때 실행되는 부분
      console.error("삭제 실패:", error); // 콘솔에 에러 출력
      alert("삭제에 실패했습니다: " + error.message); // 사용자에게 에러 메시지 보여주기
    }
  }

  if (!user) {
    return (
      <div
        style={{
          // style: 화면에 보이는 모양을 정하는 것
          textAlign: "center", // 글자를 가운데 정렬
          marginTop: "50px", // 위에서 50px 떨어뜨리기
          maxWidth: "400px", // 최대 너비 400px
          marginLeft: "auto", // 왼쪽 여백 자동
          marginRight: "auto", // 오른쪽 여백 자동 (가운데 정렬)
        }}>
        <h1>📋 할 일 관리</h1> {/* 제목 */}
        <p style={{ marginTop: "30px", marginBottom: "20px" }}>로그인이 필요합니다 {/* 안내 문구 */}</p>
        <button
          onClick={handleGoogleLogin}
          style={{
            // 버튼의 모양 정하기
            padding: "10px 20px", // 안쪽 여백 (위아래 10px, 좌우 20px)
            fontSize: "16px", // 글자 크기
            backgroundColor: "#4285f4", // 배경색 (파란색)
            color: "white", // 글자색 (흰색)
            border: "none", // 테두리 없음
            borderRadius: "5px", // 모서리를 둥글게
            cursor: "pointer", // 마우스를 올리면 손가락 모양으로 바뀜
          }}>
          Google로 로그인
        </button>
      </div>
    );
  }

  //   구글로그인 되었을 때.
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
          {/* 헤더부분 : 제목과 사용자정보,로그아웃버튼 */}
          <div>
            {/* 사용자 이름 또는 이메일 표시 */}
            <span style={{ marginRight: "10px" }}>{user.displayName || user.email}</span>
            {/* 로그아웃 버튼 */}
            <button
              onClick={handleLogout}
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
        </div>{" "}
        {/* 할일 입력 부분 */}
        <input
          type="text"
          placeholder="할일을 입력해주세요."
          value={task}
          onChange={(e) => setTask(e.target.value)}
          style={{ padding: "10px", fontSize: "16px", width: "70%" }}
        />
        {/* 추가 버튼 */}
        <button onClick={handleAdd} style={{ padding: "10px", marginLeft: "10px" }}>
          추가
        </button>
        {/* 할 일 목록 부분 */}
        <ul
          style={{
            // ul: 목록을 만드는 태그
            listStyle: "none", // 목록 앞의 점(불릿) 제거
            padding: 0, // 안쪽 여백 없음
            marginTop: "20px", // 위쪽 여백
            textAlign: "left", // 글자를 왼쪽 정렬
          }}>
          {taskList.map(({ id, text, date, done }) => (
            <li
              key={id}
              style={{
                // li: 목록의 각 항목
                marginBottom: "12px", // 아래쪽 여백 (각 할 일 사이 간격)
                background: done ? "#d4edda" : "#f8d7da", // 배경색
                // done이 true(완료)면 연한 초록색, false(미완료)면 연한 빨간색
                padding: "10px", // 안쪽 여백
                borderRadius: "5px", // 모서리를 둥글게
                display: "flex", // 가로로 나란히 배치
                alignItems: "center", // 세로로 가운데 정렬
                justifyContent: "space-between", // 양쪽 끝에 배치
              }}>
              <div>
                <input type="checkbox" checked={done} onChange={() => toggleDone(id)} style={{ marginRight: "10px" }} />
                {/* 할 일이 수정 모드일 때 */}
                {editId === id ? (
                  // 수정모드 일 때
                  <>
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      style={{ padding: "5px", fontSize: "14px", width: "70%" }}
                    />
                    <button
                      onClick={() => handleEditSave(id)} // 버튼을 클릭하면 handleEditSave 함수 실행
                      style={{
                        marginLeft: "5px", // 왼쪽 여백
                        padding: "5px 8px", // 안쪽 여백
                        backgroundColor: "green", // 배경색 (초록색)
                        color: "white", // 글자색 (흰색)
                        border: "none", // 테두리 없음
                        borderRadius: "4px", // 모서리를 둥글게
                        cursor: "pointer", // 마우스를 올리면 손가락 모양으로 바뀜
                      }}>
                      저장 {/* 버튼에 보이는 글자 */}
                    </button>
                  </>
                ) : (
                  <>
                    {" "}
                    <strong
                      style={{
                        // strong: 굵은 글씨
                        textDecoration: done ? "line-through" : "none",
                        // done이 true(완료)면 취소선, false(미완료)면 취소선 없음
                      }}>
                      {text} {/* 할 일의 내용 (예: "숙제하기") */}
                    </strong>
                    <br /> {/* 줄바꿈 */}
                    <small style={{ color: "#666" }}>{date}</small>
                    {/* small: 작은 글씨, 날짜를 회색으로 표시 */}
                  </>
                )}
              </div>
              {/* 수정 삭제 버튼 */}
              {/* 오른쪽 부분: 수정 버튼과 삭제 버튼 */}
              <div>
                {/* editId !== id: 이 할 일이 수정 모드가 아닐 때만 수정 버튼 보여주기 */}
                {editId !== id && (
                  <button
                    onClick={() => handleEditStart(id, text)} // 버튼을 클릭하면 handleEditStart 함수 실행
                    style={{
                      background: "orange", // 배경색 (주황색)
                      color: "white", // 글자색 (흰색)
                      border: "none", // 테두리 없음
                      borderRadius: "4px", // 모서리를 둥글게
                      padding: "5px 8px", // 안쪽 여백
                      cursor: "pointer", // 마우스를 올리면 손가락 모양으로 바뀜
                      marginRight: "5px", // 오른쪽 여백
                    }}>
                    수정 {/* 버튼에 보이는 글자 */}
                  </button>
                )}

                {/* 삭제 버튼 */}
                <button
                  onClick={() => handleDelete(id)} // 버튼을 클릭하면 handleDelete 함수 실행
                  style={{
                    background: "red", // 배경색 (빨간색)
                    color: "white", // 글자색 (흰색)
                    border: "none", // 테두리 없음
                    borderRadius: "4px", // 모서리를 둥글게
                    padding: "5px 8px", // 안쪽 여백
                    cursor: "pointer", // 마우스를 올리면 손가락 모양으로 바뀜
                  }}>
                  삭제 {/* 버튼에 보이는 글자 */}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
