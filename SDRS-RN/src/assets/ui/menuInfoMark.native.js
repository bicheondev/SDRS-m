import Svg, {
  Defs,
  G,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

export default function MenuInfoMark({
  height = 64,
  width = 73.901,
  ...props
}) {
  return (
    <Svg
      fill="none"
      height={height}
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 93.9008 84"
      width={width}
      {...props}
    >
      <G>
        <Path d="M46.9504 10L83.9008 74H10L46.9504 10Z" fill="black" />
        <Path
          d="M53.5399 35.612L49.2708 41.857C51.0576 42.4863 52.5288 43.7298 53.5983 45.2661C55.1458 47.4894 55.919 50.3979 55.7151 53.2816C55.5099 56.1847 54.3071 59.1338 51.8158 61.351C49.3206 63.5716 45.674 64.9341 40.8035 64.9341H36.6157L39.7877 62.1998C44.4773 58.1572 45.4052 54.5514 44.7177 52.2681C44.0417 50.023 41.5147 48.1449 37.1966 48.1449H34.5093L41.7042 35.612H53.5399ZM39.7659 45.2384C43.6702 45.8843 46.6921 48.0328 47.6973 51.371C48.6177 54.4277 47.6773 57.9432 44.9099 61.3919C47.0156 60.9073 48.5947 60.0521 49.7471 59.0266C51.5564 57.4164 52.4556 55.2622 52.6111 53.0622C52.768 50.8427 52.1608 48.648 51.0443 47.0438C49.9389 45.4558 48.4033 44.5214 46.6284 44.5214H43.6801L47.6435 38.7237H43.5059L39.7659 45.2384Z"
          fill="url(#paint0)"
        />
        <Path
          d="M78.8302 71.0977H15.1904L47.0103 15.9841L78.8302 71.0977ZM20.5801 67.986H73.4405L47.0103 22.2074L20.5801 67.986Z"
          fill="url(#paint1)"
        />
      </G>
      <Defs>
        <LinearGradient id="paint0" x1="45.1283" y1="22" x2="45.1283" y2="64.9341" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#F2F0E9" />
          <Stop offset="0.18" stopColor="#F5F5C9" />
          <Stop offset="0.355" stopColor="#F2F09D" />
          <Stop offset="0.465" stopColor="#EED675" />
          <Stop offset="0.5" stopColor="#3A2606" />
          <Stop offset="0.5001" stopColor="#3A2606" />
          <Stop offset="0.645" stopColor="#F2B112" />
          <Stop offset="0.755" stopColor="#F2F05A" />
          <Stop offset="0.84" stopColor="#F2F052" />
          <Stop offset="1" stopColor="#F2CD00" />
        </LinearGradient>
        <LinearGradient id="paint1" x1="47.0103" y1="15.9841" x2="47.0103" y2="71.0977" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#F2F0E9" />
          <Stop offset="0.18" stopColor="#F5F5C9" />
          <Stop offset="0.355" stopColor="#F2F09D" />
          <Stop offset="0.465" stopColor="#EED675" />
          <Stop offset="0.5" stopColor="#3A2606" />
          <Stop offset="0.5001" stopColor="#3A2606" />
          <Stop offset="0.645" stopColor="#F2B112" />
          <Stop offset="0.755" stopColor="#F2F05A" />
          <Stop offset="0.84" stopColor="#F2F052" />
          <Stop offset="1" stopColor="#F2CD00" />
        </LinearGradient>
      </Defs>
    </Svg>
  );
}
