
import React, { Component } from 'react'; 
import { Meteor } from 'meteor/meteor';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom'
// import { render } from 'react-dom';
import { Container } from 'reactstrap';
import Header from '/imports/ui/components/Header.jsx';
import Footer from '/imports/ui/components/Footer.jsx';
import Home from '/imports/ui/home/Home.jsx';
// import Blocks from '/imports/ui/pages/Blocks.jsx';
import Validators from '/imports/ui/validators/Validators.jsx';
// import ValidatorCandidates from '/imports/ui/validators/ValidatorCandidates.jsx';
import ValidatorRevoked from '/imports/ui/validators/ValidatorRevoked.jsx';
import NotFound from '/imports/ui/pages/NotFound.jsx';

import BlocksTable from '/imports/ui/blocks/BlocksTable.jsx';
// import './App.js'


class App extends Component {
    constructor(props){
        super(props);
    }

    render() {
        return(
            <Router>
                <div>
                    <Header />
                    <Container fluid id="main">
                        <Switch>
                            <Route exact path="/" component={Home} />
                            <Route path="/blocks" component={BlocksTable} />
                            <Route exact path="/validators" component={Validators} />
                            {/* <Route path="/validators/candidates" component={ValidatorCandidates} /> */}
                            <Route path="/validators/revoked" component={ValidatorRevoked} />
                            <Route component={NotFound} />
                        </Switch>
                    </Container>
                    <Footer />
                </div>
            </Router>
        );
    }
}

export default App