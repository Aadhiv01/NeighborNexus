import React from "react";
import { NavLink } from "react-router-dom";
import { Avatar } from "primereact/avatar";
import Button from "@mui/material/Button";
import "./Header.css";

const Header = () => {
  return (
    <div className="shadow-xl">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "0vh",
          padding: "3%",
          position: "relative",
        }}
      >
        <div style={{ marginLeft: "2vw" }}>
          <strong style={{ fontSize: "1.4rem" }}>
            <span className="p-d-flex p-jc-center p-mb-3">
              <Avatar icon="pi pi-home" style={{ background: "none" }} />
            </span>
            NeighborNexus
          </strong>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "flex-end",
            color: "white",
            flexGrow: "1",
          }}
        >
          <NavLink
            to="/services"
            className="underLine2 hide_on_responsive text-white"
          >
            <Button color="inherit">SERVICES</Button>
          </NavLink>
          <NavLink
            to="/clients"
            className="underLine2 hide_on_responsive text-white"
          >
            <Button color="inherit">CLIENTS</Button>
          </NavLink>
          <NavLink
            to="/careers"
            className="underLine2 hide_on_responsive text-white"
          >
            <Button color="inherit">CAREERS</Button>
          </NavLink>
          <NavLink
            to="/about"
            className="underLine2 hide_on_responsive text-white"
          >
            <Button color="inherit">ABOUT</Button>
          </NavLink>
          <NavLink to="/contact" className="underLine2">
            <Button
              variant="outlined"
              style={{ border: "1.4px solid #d83838", color: "white" }}
            >
              CONTACT
            </Button>
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default Header;
