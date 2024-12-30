import axios from "axios";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { BeatLoader } from "react-spinners";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BACK_SERVER_URL } from "../../config/config";
import CourseExam from "./exam/CourseExam";
import CourseHw from "./hw/CourseHw";

export default function Course() {
  const { id } = useParams();

  const location = useLocation();
  const courseInfo = location.state?.courseInfo;
  console.log(courseInfo);

  const [hws, setHws] = useState([]);
  const [exams, setExams] = useState([]);
  const [loader, setLoader] = useState(true);

  useEffect(() => {
    let apiUrl =
      localStorage.getItem("role") === "student"
        ? `${BACK_SERVER_URL}/api/student/assignmentsAndExams/${id}`
        : `${BACK_SERVER_URL}/api/teacher/assignmentsAndExams/${id}`;

    axios
      .get(apiUrl, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access-token")}`,
        },
      })
      .then((res) => {
        console.log(res.data.assignments);
        setHws(res.data.assignments);
        setExams(res.data.exams);
        setLoader(false);
      })
      .catch((err) => {
        const error = err.response ? err.response.data.message : err.message;
        toast.error(error, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });
        setLoader(false);
      });
  }, [id]);

  return (
    <div>
      {loader ? (
        <div className="courses-spinner">
          <BeatLoader color={"#7D99D3"} size={20} loading={loader} />
        </div>
      ) : (
        <div className="courses-container">
          <ToastContainer />
          {loader ? (
            <div className="courses-spinner">
              <BeatLoader color={"#7D99D3"} size={20} loading={loader} />
            </div>
          ) : (
            <div className="courses-right">
              <h2 style={{ color: "#445E93" }}>
                {courseInfo?.semester} {courseInfo?.name}
              </h2>

              <CourseHw hws={hws} courseInfo={courseInfo}></CourseHw>
              <CourseExam exams={exams} courseInfo={courseInfo}></CourseExam>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
