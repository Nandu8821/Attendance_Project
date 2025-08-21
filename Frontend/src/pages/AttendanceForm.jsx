
import { useState, useEffect, useRef } from "react";
import officeData from "../assets/officeData";

function AttendanceForm() {
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    empCode: "",
    site: "",
    entryType: "",
    workShift: "",
    locationName: "",
    image: null,
  });
  const [filteredEmails, setFilteredEmails] = useState(officeData);
  const [filteredSites, setFilteredSites] = useState([]);
  const [nearbyOffices, setNearbyOffices] = useState([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState({
    hasCheckedIn: false,
    hasCheckedOut: false,
  });
  const [errorMessage, setErrorMessage] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const offices = [
    { name: "Home", lat: 23.231878, lng: 77.455833 },
    { name: "Office/कार्यालय", lat: 23.19775059819785, lng: 77.41701272524529 },
    { name: "RNTU/आरएनटीयू", lat: 23.133186, lng: 77.564695 },
    { name: "Dubey Ji Site/दुबे जी साइट", lat: 23.124046, lng: 77.497393 },
    { name: "Regional Center West", lat: 37.7749, lng: -122.4208 },
    { name: "Satellite Office 1", lat: 37.776, lng: -122.4194 },
    { name: "Satellite Office 2", lat: 37.7738, lng: -122.4194 },
    { name: "Admin Building", lat: 37.7752, lng: -122.42 },
    { name: "Tech Hub", lat: 37.7745, lng: -122.4188 },
    { name: "Support Center", lat: 37.78, lng: -122.41 },
  ];

  const isSpecificRCC =
    formData.site.toLowerCase() === "rcc office/आरसीसी कार्यालय".toLowerCase();

  // Load attendance status from localStorage and MongoDB
  const fetchAttendanceStatus = async (email) => {
    if (!email || !officeData.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
      setAttendanceStatus({ hasCheckedIn: false, hasCheckedOut: false });
      return;
    }
    try {
      console.log('Fetching attendance status for email:', email);
      const response = await fetch(
        `https://attendance-project-cwgw.onrender.com/api/attendance?email=${encodeURIComponent(email)}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch attendance records: ${response.statusText}`);
      }
      const records = await response.json();
      console.log("API Response:", records);

      const hasCheckedIn = records.some(
        (record) => record.entryType?.trim().toLowerCase() === "in"
      );
      const hasCheckedOut = records.some(
        (record) => record.entryType?.trim().toLowerCase() === "out"
      );

      console.log("hasCheckedIn:", hasCheckedIn);
      console.log("hasCheckedOut:", hasCheckedOut);

      // Update localStorage
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem(`attendance_${email}_${today}`, JSON.stringify({
        hasCheckedIn,
        hasCheckedOut,
        timestamp: new Date().getTime(),
      }));

      setAttendanceStatus({ hasCheckedIn, hasCheckedOut });
      setErrorMessage("");
    } catch (error) {
      console.error("Error fetching attendance status:", error.message, error.stack);
      setErrorMessage(`Error fetching attendance status: ${error.message}`);
      setAttendanceStatus({ hasCheckedIn: false, hasCheckedOut: false });
    }
  };

  // Check localStorage on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const storedEmail = localStorage.getItem('userEmail');
    const storedAttendance = localStorage.getItem(`attendance_${storedEmail}_${today}`);

    if (storedEmail) {
      const user = officeData.find((u) => u.email.toLowerCase() === storedEmail.toLowerCase());
      if (user) {
        setFormData((prev) => ({
          ...prev,
          email: user.email,
          name: user.name,
          empCode: user.empCode,
        }));
        if (storedAttendance) {
          const { hasCheckedIn, hasCheckedOut, timestamp } = JSON.parse(storedAttendance);
          const now = new Date().getTime();
          if (now - timestamp < 24 * 60 * 60 * 1000) { // Valid for 24 hours
            setAttendanceStatus({ hasCheckedIn, hasCheckedOut });
          } else {
            localStorage.removeItem(`attendance_${storedEmail}_${today}`);
            setAttendanceStatus({ hasCheckedIn: false, hasCheckedOut: false });
          }
        }
        fetchAttendanceStatus(storedEmail);
      } else {
        setErrorMessage("Invalid email in localStorage. Please select a valid email.");
        localStorage.removeItem('userEmail');
      }
    }
    setFilteredEmails(officeData);
    const uniqueSites = [...new Set(officeData.map((user) => user.site))];
    setFilteredSites(uniqueSites);
  }, []);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      entryType: "",
      locationName: "",
      image: null,
    }));
    setCapturedImage(null);
    setNearbyOffices([]);
  }, [formData.email]);

  const handleEmailSelect = (email) => {
    const today = new Date().toISOString().split('T')[0];
    const storedEmail = localStorage.getItem('userEmail');

    if (storedEmail && storedEmail.toLowerCase() !== email.toLowerCase()) {
      setErrorMessage("Another email is already used for today's attendance. Please use the same email.");
      return;
    }

    const user = officeData.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      setFormData((prev) => ({
        ...prev,
        email: user.email,
        name: user.name,
        empCode: user.empCode,
        site: "",
        entryType: "",
        workShift: "",
        locationName: "",
        image: null,
      }));
      setFilteredEmails([]);
      setErrorMessage("");
      localStorage.setItem('userEmail', user.email);
      fetchAttendanceStatus(user.email);
    } else {
      setErrorMessage("Selected email is not valid. Please choose from the dropdown.");
    }
  };

  const handleEmailSearch = (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = officeData.filter((user) =>
      user.email.toLowerCase().includes(searchTerm)
    );
    setFilteredEmails(filtered);
    setFormData((prev) => ({ ...prev, email: e.target.value }));
  };

  const handleSiteSelect = (site) => {
    setFormData((prev) => ({
      ...prev,
      site,
      entryType: "",
      locationName: "",
      image: null,
    }));
    setFilteredSites([]);
    setCapturedImage(null);
    setNearbyOffices([]);
  };

  const handleSiteSearch = (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const uniqueSites = [...new Set(officeData.map((user) => user.site))];
    const filtered = uniqueSites.filter((site) =>
      site.toLowerCase().includes(searchTerm)
    );
    setFilteredSites(filtered);
    setFormData((prev) => ({ ...prev, site: e.target.value }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleGetNearbyOffices = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          console.log("Current location:", userLat, userLng);

          const filteredOffices = offices.filter(
            (office) =>
              calculateDistance(userLat, userLng, office.lat, office.lng) <= 300
          );
          setNearbyOffices(filteredOffices);

          const nearbyOfficeNames = filteredOffices
            .map((office) => office.name)
            .join(", ");
          setFormData((prev) => ({
            ...prev,
            locationName: nearbyOfficeNames || "No offices within 300m",
          }));
          console.log("Nearby offices within 300m:", filteredOffices);
        },
        (error) => {
          console.error("Error fetching location:", error.message);
          setErrorMessage("Unable to fetch your location. Please enable geolocation.");
          setFormData((prev) => ({
            ...prev,
            locationName: "Location access denied",
          }));
        }
      );
    } else {
      setErrorMessage("Geolocation is not supported by this browser.");
      setFormData((prev) => ({
        ...prev,
        locationName: "Geolocation not supported",
      }));
    }
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Error accessing camera:", err.message);
      setErrorMessage("Unable to access camera. Please check permissions.");
      setIsCameraOpen(false);
    }
  };

  const takePhoto = () => {
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext("2d");
      context.drawImage(
        videoRef.current,
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
      canvasRef.current.toBlob((blob) => {
        setFormData((prev) => ({ ...prev, image: blob }));
        setCapturedImage(URL.createObjectURL(blob));
        stopCamera();
      }, "image/jpeg");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    }
    setIsCameraOpen(false);
  };

  const toBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const handleSubmit = async () => {
    setErrorMessage("");
    const requiredFields = {
      email: "Email Address",
      name: "Name",
      empCode: "Emp Code",
      site: "Site",
      entryType: "Entry Type",
      workShift: "Work Shift",
      locationName: "Location Name",
      image: "Image",
    };

    const missingFields = Object.keys(requiredFields).filter(
      (key) => !formData[key] || formData[key] === ""
    );

    if (missingFields.length > 0) {
      const missingFieldNames = missingFields
        .map((key) => requiredFields[key])
        .join(", ");
      setErrorMessage(`Please fill in all required fields: ${missingFieldNames}`);
      return;
    }

    // Validate email against officeData
    const user = officeData.find((user) => user.email.toLowerCase() === formData.email.toLowerCase());
    if (!user) {
      setErrorMessage("Invalid email. Please select a valid email from the suggestions.");
      return;
    }

    // Validate name and empCode
    if (user.name !== formData.name || user.empCode !== formData.empCode) {
      setErrorMessage("Name or Employee Code does not match the selected email.");
      return;
    }

    // Check if the email matches the one stored in localStorage
    const today = new Date().toISOString().split('T')[0];
    const storedEmail = localStorage.getItem('userEmail');
    if (storedEmail && storedEmail.toLowerCase() !== formData.email.toLowerCase()) {
      setErrorMessage("Another email is already used for today's attendance. Please use the same email.");
      return;
    }

    // Check localStorage for attendance status
    const storedStatus = localStorage.getItem(`attendance_${formData.email}_${today}`);
    let hasCheckedIn = false;
    let hasCheckedOut = false;

    if (storedStatus) {
      const status = JSON.parse(storedStatus);
      hasCheckedIn = status.hasCheckedIn;
      hasCheckedOut = status.hasCheckedOut;
    }

    if (isSpecificRCC) {
      if (formData.entryType === "Out" && !hasCheckedIn) {
        setErrorMessage("You must Check In before Checking Out.");
        return;
      }
      if (formData.entryType === "In" && hasCheckedIn) {
        setErrorMessage("You have already checked in today.");
        return;
      }
      if (formData.entryType === "Out" && hasCheckedOut) {
        setErrorMessage("You have already checked out today.");
        return;
      }
    }

    try {
      console.log("Submitting email:", formData.email);
      const imageBase64 = await toBase64(formData.image);

      const payload = {
        email: formData.email,
        name: formData.name,
        empCode: formData.empCode,
        site: formData.site,
        entryType: formData.entryType,
        workShift: formData.workShift,
        locationName: formData.locationName,
        image: imageBase64,
      };

      const response = await fetch("https://attendance-project-cwgw.onrender.com/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      console.log("Response status:", response.status);
      console.log("Response data:", responseData);

      if (response.ok && responseData.result === "success") {
        console.log("Attendance submitted successfully");
        alert("Attendance submitted successfully!");

        // Update localStorage with email and entry type
        const newStatus = {
          hasCheckedIn: hasCheckedIn || formData.entryType === "In",
          hasCheckedOut: hasCheckedOut || formData.entryType === "Out",
          entryType: formData.entryType,
          timestamp: new Date().getTime(),
        };
        localStorage.setItem(`attendance_${formData.email}_${today}`, JSON.stringify(newStatus));
        localStorage.setItem('userEmail', formData.email);

        fetchAttendanceStatus(formData.email);
        setFormData({
          email: formData.email,
          name: formData.name,
          empCode: formData.empCode,
          site: "",
          entryType: "",
          workShift: "",
          locationName: "",
          image: null,
        });
        setNearbyOffices([]);
        setCapturedImage(null);
        setFilteredEmails(officeData);
        setErrorMessage("");
      } else {
        console.error("Error sending data:", responseData.error, responseData.details);
        setErrorMessage(
          `Error submitting attendance: ${responseData.error || "Please try again."}${responseData.details ? ` (${responseData.details})` : ""}`
        );
      }
    } catch (error) {
      console.error("Error submitting attendance:", error.message, error.stack);
      setErrorMessage(`Error submitting attendance: ${error.message}`);
    }
  };

  const availableEntryTypes = isSpecificRCC
    ? attendanceStatus.hasCheckedIn
      ? [{ value: "Out", label: "Check Out" }]
      : [{ value: "In", label: "Check In" }]
    : [
        { value: "In", label: "Check In" },
        { value: "Out", label: "Check Out" },
      ];

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-2xl border border-blue-100">
      <h2 className="text-2xl font-bold text-blue-800 mb-6 text-center bg-gradient-to-r from-blue-600 to-blue-400 text-transparent bg-clip-text">
        Attendance Form
      </h2>
      {errorMessage && (
        <div className="text-center text-red-500 font-semibold mb-4">
          {errorMessage}
        </div>
      )}
      {isSpecificRCC && attendanceStatus.hasCheckedIn && attendanceStatus.hasCheckedOut ? (
        <div className="text-center text-red-500 font-semibold">
          You have already submitted both Check In and Check Out for today.
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleEmailSearch}
              className="mt-1 block w-full px-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition duration-200"
              placeholder="Type to search email..."
              autoComplete="off"
              required
            />
            {formData.email && filteredEmails.length > 0 && (
              <div className="mt-1 border border-gray-200 rounded-lg shadow-sm bg-white max-h-40 overflow-y-auto">
                {filteredEmails.map((user) => (
                  <div
                    key={user.email}
                    onClick={() => handleEmailSelect(user.email)}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                  >
                    {user.email}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full px-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition duration-200"
              readOnly
              required
            />
          </div>
          <div>
            <label
              htmlFor="empCode"
              className="block text-sm font-medium text-gray-700"
            >
              Emp Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="empCode"
              name="empCode"
              value={formData.empCode}
              onChange={handleChange}
              className="mt-1 block w-full px-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition duration-200"
              readOnly
              required
            />
          </div>
          <div>
            <label
              htmlFor="site"
              className="block text-sm font-medium text-gray-700"
            >
              Site <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="site"
              name="site"
              value={formData.site}
              onChange={handleSiteSearch}
              className="mt-1 block w-full px-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition duration-200"
              placeholder="Type to search site..."
              autoComplete="off"
              required
            />
            {formData.site && filteredSites.length > 0 && (
              <div className="mt-1 border border-gray-200 rounded-lg shadow-sm bg-white max-h-40 overflow-y-auto">
                {filteredSites.map((site) => (
                  <div
                    key={site}
                    onClick={() => handleSiteSelect(site)}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                  >
                    {site}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label
              htmlFor="entryType"
              className="block text-sm font-medium text-gray-700"
            >
              Entry Type <span className="text-red-500">*</span>
            </label>
            <select
              id="entryType"
              name="entryType"
              value={formData.entryType}
              onChange={handleChange}
              className="mt-1 block w-full px-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 appearance-none bg-white"
              required
            >
              <option value="">-- Select Entry Type --</option>
              {availableEntryTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="workShift"
              className="block text-sm font-medium text-gray-700"
            >
              Work Shift <span className="text-red-500">*</span>
            </label>
            <select
              id="workShift"
              name="workShift"
              value={formData.workShift}
              onChange={handleChange}
              className="mt-1 block w-full px-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 appearance-none bg-white"
              required
            >
              <option value="">-- Select Work Shift --</option>
              <option value="09:00 AM - 06:00 PM">09:00 AM - 06:00 PM</option>
              <option value="09:30 AM - 06:00 PM">09:30 AM - 06:00 PM</option>
              <option value="02:00 PM - 06:00 PM">02:00 PM - 06:00 PM</option>
              <option value="09:00 PM - 01:00 PM">09:00 PM - 01:00 PM</option>
              <option value="08:00 AM - 04:00 PM">08:00 AM - 04:00 PM</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="locationName"
              className="block text-sm font-medium text-gray-700"
            >
              Location Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="locationName"
              name="locationName"
              value={formData.locationName}
              onChange={handleChange}
              className="mt-1 block w-full px-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition duration-200"
              placeholder="Click 'Get Nearby Offices' to populate"
              readOnly
              required
            />
          </div>
          <div>
            <button
              type="button"
              onClick={handleGetNearbyOffices}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg shadow-md hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 transition duration-300"
            >
              Get Nearby Offices
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Capture Image <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={startCamera}
              className="mt-1 w-full px-4 py-2 bg-blue-500 text-white rounded-lg shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200"
            >
              Open Camera
            </button>
            {isCameraOpen && (
              <div className="mt-2">
                <video ref={videoRef} className="w-full" playsInline />
                <button
                  type="button"
                  onClick={takePhoto}
                  className="mt-2 w-full px-4 py-2 bg-green-500 text-white rounded-lg shadow-sm hover:bg-green-600"
                >
                  Take Photo
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="mt-2 w-full px-4 py-2 bg-red-500 text-white rounded-lg shadow-sm hover:bg-red-600"
                >
                  Cancel
                </button>
              </div>
            )}
            {capturedImage && (
              <div className="mt-2">
                <img src={capturedImage} alt="Captured" className="w-full" />
              </div>
            )}
            <canvas
              ref={canvasRef}
              width="640"
              height="480"
              style={{ display: "none" }}
            />
          </div>
          <div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSpecificRCC && attendanceStatus.hasCheckedIn && attendanceStatus.hasCheckedOut}
              className={`w-full px-6 py-3 font-semibold rounded-lg shadow-md transition duration-300 ${
                isSpecificRCC && attendanceStatus.hasCheckedIn && attendanceStatus.hasCheckedOut
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              }`}
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendanceForm;



// ////////////////////////  TRY  bala code upar bala ha niche bala main code ha ///////////////////////////////////


// AttendanceForm.jsx (Updated Modified Version)
// import { useState, useEffect, useRef } from "react";
// import officeData from "../assets/officeData";

// function AttendanceForm() {
//   const [formData, setFormData] = useState({
//     email: "",
//     name: "",
//     empCode: "",
//     site: "",
//     entryType: "",
//     workShift: "",
//     locationName: "",
//     image: null,
//   });
//   const [filteredEmails, setFilteredEmails] = useState(officeData);
//   const [filteredSites, setFilteredSites] = useState([]);
//   const [nearbyOffices, setNearbyOffices] = useState([]);
//   const [isCameraOpen, setIsCameraOpen] = useState(false);
//   const [capturedImage, setCapturedImage] = useState(null);
//   const [attendanceStatus, setAttendanceStatus] = useState({
//     hasCheckedIn: false,
//     hasCheckedOut: false,
//   });
//   const [errorMessage, setErrorMessage] = useState("");
//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);

//   const offices = [
//     { name: "Home", lat: 23.231878, lng: 77.455833 },
//     { name: "Office/कार्यालय", lat: 23.19775059819785, lng: 77.41701272524529 },
//     { name: "RNTU/आरएनटीयू", lat: 23.133186, lng: 77.564695 },
//     { name: "Dubey Ji Site/दुबे जी साइट", lat: 23.124046, lng: 77.497393 },
//     { name: "Regional Center West", lat: 37.7749, lng: -122.4208 },
//     { name: "Satellite Office 1", lat: 37.776, lng: -122.4194 },
//     { name: "Satellite Office 2", lat: 37.7738, lng: -122.4194 },
//     { name: "Admin Building", lat: 37.7752, lng: -122.42 },
//     { name: "Tech Hub", lat: 37.7745, lng: -122.4188 },
//     { name: "Support Center", lat: 37.78, lng: -122.41 },
//   ];

//   const isSpecificRCC =
//     formData.site.toLowerCase() === "rcc office/आरसीसी कार्यालय".toLowerCase();

//   // Load attendance status from localStorage and MongoDB
//   const fetchAttendanceStatus = async (email) => {
//     if (!email || !officeData.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
//       setAttendanceStatus({ hasCheckedIn: false, hasCheckedOut: false });
//       return;
//     }
//     try {
//       console.log('Fetching attendance status for email:', email);
//       const response = await fetch(
//         `https://attendance-project-cwgw.onrender.com/api/attendance?email=${encodeURIComponent(email)}`
//       );
//       if (!response.ok) {
//         throw new Error(`Failed to fetch attendance records: ${response.statusText}`);
//       }
//       const records = await response.json();
//       console.log("API Response:", records);

//       const hasCheckedIn = records.some(
//         (record) => record.entryType?.trim().toLowerCase() === "in"
//       );
//       const hasCheckedOut = records.some(
//         (record) => record.entryType?.trim().toLowerCase() === "out"
//       );

//       console.log("hasCheckedIn:", hasCheckedIn);
//       console.log("hasCheckedOut:", hasCheckedOut);

//       // Update localStorage
//       const today = new Date().toISOString().split('T')[0];
//       localStorage.setItem(`attendance_${email}_${today}`, JSON.stringify({
//         hasCheckedIn,
//         hasCheckedOut,
//         timestamp: new Date().getTime(),
//       }));

//       setAttendanceStatus({ hasCheckedIn, hasCheckedOut });
//       setErrorMessage("");
//     } catch (error) {
//       console.error("Error fetching attendance status:", error.message, error.stack);
//       setErrorMessage(`Error fetching attendance status: ${error.message}`);
//       setAttendanceStatus({ hasCheckedIn: false, hasCheckedOut: false });
//     }
//   };

//   // Check localStorage on mount
//   useEffect(() => {
//     const email = localStorage.getItem('userEmail');
//     if (email) {
//       const user = officeData.find((u) => u.email.toLowerCase() === email.toLowerCase());
//       if (user) {
//         setFormData((prev) => ({
//           ...prev,
//           email: user.email,
//           name: user.name,
//           empCode: user.empCode,
//         }));
//         // Check localStorage for attendance status
//         const today = new Date().toISOString().split('T')[0];
//         const storedStatus = localStorage.getItem(`attendance_${email}_${today}`);
//         if (storedStatus) {
//           const { hasCheckedIn, hasCheckedOut, timestamp } = JSON.parse(storedStatus);
//           const now = new Date().getTime();
//           if (now - timestamp < 24 * 60 * 60 * 1000) { // Valid for 24 hours
//             setAttendanceStatus({ hasCheckedIn, hasCheckedOut });
//           } else {
//             localStorage.removeItem(`attendance_${email}_${today}`);
//             setAttendanceStatus({ hasCheckedIn: false, hasCheckedOut: false });
//           }
//         }
//         fetchAttendanceStatus(email);
//       } else {
//         setErrorMessage("Invalid email in localStorage. Please select a valid email.");
//         localStorage.removeItem('userEmail');
//       }
//     }
//     setFilteredEmails(officeData);
//     const uniqueSites = [...new Set(officeData.map((user) => user.site))];
//     setFilteredSites(uniqueSites);
//   }, []);

//   useEffect(() => {
//     setFormData((prev) => ({
//       ...prev,
//       entryType: "",
//       locationName: "",
//       image: null,
//     }));
//     setCapturedImage(null);
//     setNearbyOffices([]);
//   }, [formData.email]);

//   const handleEmailSelect = (email) => {
//     const user = officeData.find((u) => u.email.toLowerCase() === email.toLowerCase());
//     if (user) {
//       setFormData((prev) => ({
//         ...prev,
//         email: user.email,
//         name: user.name,
//         empCode: user.empCode,
//         site: "",
//         entryType: "",
//         workShift: "",
//         locationName: "",
//         image: null,
//       }));
//       setFilteredEmails([]);
//       setErrorMessage("");
//       localStorage.setItem('userEmail', user.email);
//       fetchAttendanceStatus(user.email);
//     } else {
//       setErrorMessage("Selected email is not valid. Please choose from the dropdown.");
//     }
//   };

//   const handleEmailSearch = (e) => {
//     const searchTerm = e.target.value.toLowerCase();
//     const filtered = officeData.filter((user) =>
//       user.email.toLowerCase().includes(searchTerm)
//     );
//     setFilteredEmails(filtered);
//     setFormData((prev) => ({ ...prev, email: e.target.value }));
//   };

//   const handleSiteSelect = (site) => {
//     setFormData((prev) => ({
//       ...prev,
//       site,
//       entryType: "",
//       locationName: "",
//       image: null,
//     }));
//     setFilteredSites([]);
//     setCapturedImage(null);
//     setNearbyOffices([]);
//   };

//   const handleSiteSearch = (e) => {
//     const searchTerm = e.target.value.toLowerCase();
//     const uniqueSites = [...new Set(officeData.map((user) => user.site))];
//     const filtered = uniqueSites.filter((site) =>
//       site.toLowerCase().includes(searchTerm)
//     );
//     setFilteredSites(filtered);
//     setFormData((prev) => ({ ...prev, site: e.target.value }));
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const calculateDistance = (lat1, lon1, lat2, lon2) => {
//     const R = 6371e3;
//     const φ1 = (lat1 * Math.PI) / 180;
//     const φ2 = (lat2 * Math.PI) / 180;
//     const Δφ = ((lat2 - lat1) * Math.PI) / 180;
//     const Δλ = ((lon2 - lon1) * Math.PI) / 180;

//     const a =
//       Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
//       Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//     return R * c;
//   };

//   const handleGetNearbyOffices = () => {
//     if (navigator.geolocation) {
//       navigator.geolocation.getCurrentPosition(
//         (position) => {
//           const userLat = position.coords.latitude;
//           const userLng = position.coords.longitude;
//           console.log("Current location:", userLat, userLng);

//           const filteredOffices = offices.filter(
//             (office) =>
//               calculateDistance(userLat, userLng, office.lat, office.lng) <= 300
//           );
//           setNearbyOffices(filteredOffices);

//           const nearbyOfficeNames = filteredOffices
//             .map((office) => office.name)
//             .join(", ");
//           setFormData((prev) => ({
//             ...prev,
//             locationName: nearbyOfficeNames || "No offices within 300m",
//           }));
//           console.log("Nearby offices within 300m:", filteredOffices);
//         },
//         (error) => {
//           console.error("Error fetching location:", error.message);
//           setErrorMessage("Unable to fetch your location. Please enable geolocation.");
//           setFormData((prev) => ({
//             ...prev,
//             locationName: "Location access denied",
//           }));
//         }
//       );
//     } else {
//       setErrorMessage("Geolocation is not supported by this browser.");
//       setFormData((prev) => ({
//         ...prev,
//         locationName: "Geolocation not supported",
//       }));
//     }
//   };

//   const startCamera = async () => {
//     setIsCameraOpen(true);
//     setCapturedImage(null);
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: { facingMode: "user" },
//       });
//       if (videoRef.current) {
//         videoRef.current.srcObject = stream;
//         videoRef.current.play();
//       }
//     } catch (err) {
//       console.error("Error accessing camera:", err.message);
//       setErrorMessage("Unable to access camera. Please check permissions.");
//       setIsCameraOpen(false);
//     }
//   };

//   const takePhoto = () => {
//     if (canvasRef.current && videoRef.current) {
//       const context = canvasRef.current.getContext("2d");
//       context.drawImage(
//         videoRef.current,
//         0,
//         0,
//         canvasRef.current.width,
//         canvasRef.current.height
//       );
//       canvasRef.current.toBlob((blob) => {
//         setFormData((prev) => ({ ...prev, image: blob }));
//         setCapturedImage(URL.createObjectURL(blob));
//         stopCamera();
//       }, "image/jpeg");
//     }
//   };

//   const stopCamera = () => {
//     if (videoRef.current && videoRef.current.srcObject) {
//       const tracks = videoRef.current.srcObject.getTracks();
//       tracks.forEach((track) => track.stop());
//     }
//     setIsCameraOpen(false);
//   };

//   const toBase64 = (blob) =>
//     new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.readAsDataURL(blob);
//       reader.onload = () => resolve(reader.result);
//       reader.onerror = (error) => reject(error);
//     });

//   const handleSubmit = async () => {
//     setErrorMessage("");
//     const requiredFields = {
//       email: "Email Address",
//       name: "Name",
//       empCode: "Emp Code",
//       site: "Site",
//       entryType: "Entry Type",
//       workShift: "Work Shift",
//       locationName: "Location Name",
//       image: "Image",
//     };

//     const missingFields = Object.keys(requiredFields).filter(
//       (key) => !formData[key] || formData[key] === ""
//     );

//     if (missingFields.length > 0) {
//       const missingFieldNames = missingFields
//         .map((key) => requiredFields[key])
//         .join(", ");
//       setErrorMessage(`Please fill in all required fields: ${missingFieldNames}`);
//       return;
//     }

//     // Validate email against officeData
//     const user = officeData.find((user) => user.email.toLowerCase() === formData.email.toLowerCase());
//     if (!user) {
//       setErrorMessage("Invalid email. Please select a valid email from the suggestions.");
//       return;
//     }

//     // Validate name and empCode
//     if (user.name !== formData.name || user.empCode !== formData.empCode) {
//       setErrorMessage("Name or Employee Code does not match the selected email.");
//       return;
//     }

//     // Check localStorage for attendance status
//     const today = new Date().toISOString().split('T')[0];
//     const storedStatus = localStorage.getItem(`attendance_${formData.email}_${today}`);
//     let hasCheckedIn = false;
//     let hasCheckedOut = false;

//     if (storedStatus) {
//       const status = JSON.parse(storedStatus);
//       hasCheckedIn = status.hasCheckedIn;
//       hasCheckedOut = status.hasCheckedOut;
//     }

//     if (isSpecificRCC) {
//       if (formData.entryType === "Out" && !hasCheckedIn) {
//         setErrorMessage("You must Check In before Checking Out.");
//         return;
//       }
//       if (formData.entryType === "In" && hasCheckedIn) {
//         setErrorMessage("You have already checked in today.");
//         return;
//       }
//       if (formData.entryType === "Out" && hasCheckedOut) {
//         setErrorMessage("You have already checked out today.");
//         return;
//       }
//     }

//     try {
//       console.log("Submitting email:", formData.email);
//       const imageBase64 = await toBase64(formData.image);

//       const payload = {
//         email: formData.email,
//         name: formData.name,
//         empCode: formData.empCode,
//         site: formData.site,
//         entryType: formData.entryType,
//         workShift: formData.workShift,
//         locationName: formData.locationName,
//         image: imageBase64,
//       };

//       const response = await fetch("https://attendance-project-cwgw.onrender.com/api/attendance", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(payload),
//       });

//       const responseData = await response.json();
//       console.log("Response status:", response.status);
//       console.log("Response data:", responseData);

//       if (response.ok && responseData.result === "success") {
//         console.log("Attendance submitted successfully");
//         alert("Attendance submitted successfully!");

//         // Update localStorage
//         const newStatus = {
//           hasCheckedIn: hasCheckedIn || formData.entryType === "In",
//           hasCheckedOut: hasCheckedOut || formData.entryType === "Out",
//           timestamp: new Date().getTime(),
//         };
//         localStorage.setItem(`attendance_${formData.email}_${today}`, JSON.stringify(newStatus));
//         localStorage.setItem('userEmail', formData.email);

//         fetchAttendanceStatus(formData.email);
//         setFormData({
//           email: formData.email,
//           name: formData.name,
//           empCode: formData.empCode,
//           site: "",
//           entryType: "",
//           workShift: "",
//           locationName: "",
//           image: null,
//         });
//         setNearbyOffices([]);
//         setCapturedImage(null);
//         setFilteredEmails(officeData);
//         setErrorMessage("");
//       } else {
//         console.error("Error sending data:", responseData.error, responseData.details);
//         setErrorMessage(
//           `Error submitting attendance: ${responseData.error || "Please try again."}${responseData.details ? ` (${responseData.details})` : ""}`
//         );
//       }
//     } catch (error) {
//       console.error("Error submitting attendance:", error.message, error.stack);
//       setErrorMessage(`Error submitting attendance: ${error.message}`);
//     }
//   };

//   const availableEntryTypes = isSpecificRCC
//     ? attendanceStatus.hasCheckedIn
//       ? [{ value: "Out", label: "Check Out" }]
//       : [{ value: "In", label: "Check In" }]
//     : [
//         { value: "In", label: "Check In" },
//         { value: "Out", label: "Check Out" },
//       ];

//   return (
//     <div className="max-w-md mx-auto mt-8 p-6 bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-2xl border border-blue-100">
//       <h2 className="text-2xl font-bold text-blue-800 mb-6 text-center bg-gradient-to-r from-blue-600 to-blue-400 text-transparent bg-clip-text">
//         Attendance Form
//       </h2>
//       {errorMessage && (
//         <div className="text-center text-red-500 font-semibold mb-4">
//           {errorMessage}
//         </div>
//       )}
//       {isSpecificRCC && attendanceStatus.hasCheckedIn && attendanceStatus.hasCheckedOut ? (
//         <div className="text-center text-red-500 font-semibold">
//           You have already submitted both Check In and Check Out for today.
//         </div>
//       ) : (
//         <div className="space-y-5">
//           <div>
//             <label
//               htmlFor="email"
//               className="block text-sm font-medium text-gray-700"
//             >
//               Email Address <span className="text-red-500">*</span>
//             </label>
//             <input
//               type="text"
//               id="email"
//               name="email"
//               value={formData.email}
//               onChange={handleEmailSearch}
//               className="mt-1 block w-full px-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition duration-200"
//               placeholder="Type to search email..."
//               autoComplete="off"
//               required
//             />
//             {formData.email && filteredEmails.length > 0 && (
//               <div className="mt-1 border border-gray-200 rounded-lg shadow-sm bg-white max-h-40 overflow-y-auto">
//                 {filteredEmails.map((user) => (
//                   <div
//                     key={user.email}
//                     onClick={() => handleEmailSelect(user.email)}
//                     className="px-4 py-2 cursor-pointer hover:bg-gray-100"
//                   >
//                     {user.email}
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//           <div>
//             <label
//               htmlFor="name"
//               className="block text-sm font-medium text-gray-700"
//             >
//               Name <span className="text-red-500">*</span>
//             </label>
//             <input
//               type="text"
//               id="name"
//               name="name"
//               value={formData.name}
//               onChange={handleChange}
//               className="mt-1 block w-full px-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition duration-200"
//               readOnly
//               required
//             />
//           </div>
//           <div>
//             <label
//               htmlFor="empCode"
//               className="block text-sm font-medium text-gray-700"
//             >
//               Emp Code <span className="text-red-500">*</span>
//             </label>
//             <input
//               type="text"
//               id="empCode"
//               name="empCode"
//               value={formData.empCode}
//               onChange={handleChange}
//               className="mt-1 block w-full px-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition duration-200"
//               readOnly
//               required
//             />
//           </div>
//           <div>
//             <label
//               htmlFor="site"
//               className="block text-sm font-medium text-gray-700"
//             >
//               Site <span className="text-red-500">*</span>
//             </label>
//             <input
//               type="text"
//               id="site"
//               name="site"
//               value={formData.site}
//               onChange={handleSiteSearch}
//               className="mt-1 block w-full px-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition duration-200"
//               placeholder="Type to search site..."
//               autoComplete="off"
//               required
//             />
//             {formData.site && filteredSites.length > 0 && (
//               <div className="mt-1 border border-gray-200 rounded-lg shadow-sm bg-white max-h-40 overflow-y-auto">
//                 {filteredSites.map((site) => (
//                   <div
//                     key={site}
//                     onClick={() => handleSiteSelect(site)}
//                     className="px-4 py-2 cursor-pointer hover:bg-gray-100"
//                   >
//                     {site}
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//           <div>
//             <label
//               htmlFor="entryType"
//               className="block text-sm font-medium text-gray-700"
//             >
//               Entry Type <span className="text-red-500">*</span>
//             </label>
//             <select
//               id="entryType"
//               name="entryType"
//               value={formData.entryType}
//               onChange={handleChange}
//               className="mt-1 block w-full px-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 appearance-none bg-white"
//               required
//             >
//               <option value="">-- Select Entry Type --</option>
//               {availableEntryTypes.map((type) => (
//                 <option key={type.value} value={type.value}>
//                   {type.label}
//                 </option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <label
//               htmlFor="workShift"
//               className="block text-sm font-medium text-gray-700"
//             >
//               Work Shift <span className="text-red-500">*</span>
//             </label>
//             <select
//               id="workShift"
//               name="workShift"
//               value={formData.workShift}
//               onChange={handleChange}
//               className="mt-1 block w-full px-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 appearance-none bg-white"
//               required
//             >
//               <option value="">-- Select Work Shift --</option>
//               <option value="09:00 AM - 06:00 PM">09:00 AM - 06:00 PM</option>
//               <option value="09:30 AM - 06:00 PM">09:30 AM - 06:00 PM</option>
//               <option value="02:00 PM - 06:00 PM">02:00 PM - 06:00 PM</option>
//               <option value="09:00 PM - 01:00 PM">09:00 PM - 01:00 PM</option>
//               <option value="08:00 AM - 04:00 PM">08:00 AM - 04:00 PM</option>
//             </select>
//           </div>
//           <div>
//             <label
//               htmlFor="locationName"
//               className="block text-sm font-medium text-gray-700"
//             >
//               Location Name <span className="text-red-500">*</span>
//             </label>
//             <input
//               type="text"
//               id="locationName"
//               name="locationName"
//               value={formData.locationName}
//               onChange={handleChange}
//               className="mt-1 block w-full px-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition duration-200"
//               placeholder="Click 'Get Nearby Offices' to populate"
//               readOnly
//               required
//             />
//           </div>
//           <div>
//             <button
//               type="button"
//               onClick={handleGetNearbyOffices}
//               className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg shadow-md hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 transition duration-300"
//             >
//               Get Nearby Offices
//             </button>
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700">
//               Capture Image <span className="text-red-500">*</span>
//             </label>
//             <button
//               type="button"
//               onClick={startCamera}
//               className="mt-1 w-full px-4 py-2 bg-blue-500 text-white rounded-lg shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200"
//             >
//               Open Camera
//             </button>
//             {isCameraOpen && (
//               <div className="mt-2">
//                 <video ref={videoRef} className="w-full" playsInline />
//                 <button
//                   type="button"
//                   onClick={takePhoto}
//                   className="mt-2 w-full px-4 py-2 bg-green-500 text-white rounded-lg shadow-sm hover:bg-green-600"
//                 >
//                   Take Photo
//                 </button>
//                 <button
//                   type="button"
//                   onClick={stopCamera}
//                   className="mt-2 w-full px-4 py-2 bg-red-500 text-white rounded-lg shadow-sm hover:bg-red-600"
//                 >
//                   Cancel
//                 </button>
//               </div>
//             )}
//             {capturedImage && (
//               <div className="mt-2">
//                 <img src={capturedImage} alt="Captured" className="w-full" />
//               </div>
//             )}
//             <canvas
//               ref={canvasRef}
//               width="640"
//               height="480"
//               style={{ display: "none" }}
//             />
//           </div>
//           <div>
//             <button
//               type="button"
//               onClick={handleSubmit}
//               disabled={isSpecificRCC && attendanceStatus.hasCheckedIn && attendanceStatus.hasCheckedOut}
//               className={`w-full px-6 py-3 font-semibold rounded-lg shadow-md transition duration-300 ${
//                 isSpecificRCC && attendanceStatus.hasCheckedIn && attendanceStatus.hasCheckedOut
//                   ? "bg-gray-400 cursor-not-allowed"
//                   : "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
//               }`}
//             >
//               Submit
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default AttendanceForm;
