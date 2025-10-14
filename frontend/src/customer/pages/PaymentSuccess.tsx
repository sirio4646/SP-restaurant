import React from 'react';
import { Button, Typography, Box, Container, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import "../../css/PaymentSuccess.css";
const PaymentSuccess: React.FC = () => {
    const navigate = useNavigate();

    const handleGoHome = () => {
        navigate('/');
    };

    return (
        <Container maxWidth="sm" sx={{ mt: 10 }}>
            <Paper
                elevation={4}
                sx={{
                    p: 5,
                    textAlign: 'center',
                    borderRadius: 4,
                    backgroundColor: '#F2F0EF',
                }}
            >
                {/* วงกลม checkmark พร้อมแอนิเมชัน */}
                <Box sx={{ position: 'relative', display: 'inline-block', mb: 3 }}>
                    <span className="checkmark"></span>
                </Box>

                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2e7d32', mb: 2 }}>
                    ชำระเงินสำเร็จ
                </Typography>

                <Typography variant="body1" sx={{ color: '#555', mb: 4 }}>
                    ขอบคุณที่ใช้บริการ ระบบได้บันทึกการชำระเงินของคุณเรียบร้อยแล้ว
                </Typography>

                <Button
                    variant="contained"
                    sx={{
                        backgroundColor: '#4caf50',
                        '&:hover': { backgroundColor: '#43a047' },
                        px: 4,
                        py: 1.5,
                        fontWeight: 'bold',
                        borderRadius: '30px',
                    }}
                    onClick={handleGoHome}
                >
                    กลับไปหน้าหลัก
                </Button>
            </Paper>


        </Container>
    );
};

export default PaymentSuccess;
